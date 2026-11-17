/**
 * Firestore security rules tests. Run with `npm run test:rules`, which starts
 * the Firestore emulator and runs this suite against firestore.rules.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  serverTimestamp,
  setDoc,
  setLogLevel,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';

// Denied writes are the point of most tests; don't log each one as a warning.
setLogLevel('error');

const PROJECT_ID = 'demo-bloomandbump';
let env: RulesTestEnvironment;

const asUser = (uid: string) => env.authenticatedContext(uid).firestore();
const asGuest = () => env.unauthenticatedContext().firestore();
const asModerator = (uid: string) => env.authenticatedContext(uid, { moderator: true }).firestore();

/** Write fixtures with rules disabled (like the Admin SDK would). */
const seed = (path: string, data: Record<string, unknown>) =>
  env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data);
  });

const validPost = (uid: string, id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  userId: uid,
  authorName: 'Alice',
  authorPhoto: null,
  content: 'Hello from week 20!',
  pregnancyWeek: 20,
  likesCount: 0,
  commentsCount: 0,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
});

const validComment = (uid: string, overrides: Record<string, unknown> = {}) => ({
  userId: uid,
  authorName: 'Bob',
  authorPhoto: null,
  content: 'Congrats!',
  createdAt: serverTimestamp(),
  ...overrides,
});

const seededPost = (uid: string, overrides: Record<string, unknown> = {}) => ({
  id: 'p1',
  userId: uid,
  authorName: 'Alice',
  authorPhoto: null,
  content: 'Seeded post',
  likesCount: 5,
  commentsCount: 2,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  ...overrides,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(resolve(__dirname, '..', 'firestore.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

// ------------------------------------------------------------------ users

describe('users/{uid}', () => {
  const profile = { email: 'a@example.com', name: 'Alice', picture: null, currentMode: 'pregnancy' };

  it('lets the owner create, read and update their profile', async () => {
    const db = asUser('alice');
    await assertSucceeds(setDoc(doc(db, 'users/alice'), profile));
    await assertSucceeds(getDoc(doc(db, 'users/alice')));
    await assertSucceeds(updateDoc(doc(db, 'users/alice'), { name: 'Alice B' }));
  });

  it('blocks other users and guests', async () => {
    await seed('users/alice', profile);
    await assertFails(getDoc(doc(asUser('bob'), 'users/alice')));
    await assertFails(setDoc(doc(asUser('bob'), 'users/alice'), profile));
    await assertFails(getDoc(doc(asGuest(), 'users/alice')));
  });

  it.each(['subscription', 'aiUsage', 'devTierOverride'])('never lets a client write %s', async (field) => {
    const db = asUser('alice');
    await assertFails(setDoc(doc(db, 'users/alice'), { ...profile, [field]: { tier: 'premium' } }));
    await seed('users/alice', profile);
    await assertFails(updateDoc(doc(db, 'users/alice'), { [field]: { tier: 'premium' } }));
  });

  it('does not let a client change server-set fields that already exist', async () => {
    await seed('users/alice', { ...profile, subscription: { tier: 'free' } });
    await assertFails(updateDoc(doc(asUser('alice'), 'users/alice'), { 'subscription.tier': 'premium' }));
  });
});

describe('users/{uid}/pregnancies and subcollections', () => {
  const visit = { type: 'checkup', week: 12, date: Timestamp.now(), createdAt: Timestamp.now() };

  it('are owner-only', async () => {
    const alice = asUser('alice');
    await assertSucceeds(setDoc(doc(alice, 'users/alice/pregnancies/p1'), { currentWeek: 12 }));
    await assertSucceeds(setDoc(doc(alice, 'users/alice/pregnancies/p1/hospitalVisits/v1'), visit));
    await assertSucceeds(getDoc(doc(alice, 'users/alice/pregnancies/p1/hospitalVisits/v1')));

    const bob = asUser('bob');
    await assertFails(getDoc(doc(bob, 'users/alice/pregnancies/p1')));
    await assertFails(getDoc(doc(bob, 'users/alice/pregnancies/p1/hospitalVisits/v1')));
    await assertFails(setDoc(doc(bob, 'users/alice/pregnancies/p1/symptoms/s1'), { type: 'nausea' }));
    await assertFails(getDoc(doc(asGuest(), 'users/alice/pregnancies/p1')));
  });
});

describe('users/{uid}/private/{doc}', () => {
  it('owner may read but no client may write', async () => {
    await seed('users/alice/private/aiUsage', { count: 3 });
    const alice = asUser('alice');
    await assertSucceeds(getDoc(doc(alice, 'users/alice/private/aiUsage')));
    await assertFails(setDoc(doc(alice, 'users/alice/private/aiUsage'), { count: 0 }));
    await assertFails(updateDoc(doc(alice, 'users/alice/private/aiUsage'), { count: 0 }));
    await assertFails(deleteDoc(doc(alice, 'users/alice/private/aiUsage')));
    await assertFails(getDoc(doc(asUser('bob'), 'users/alice/private/aiUsage')));
  });
});

describe('users/{uid}/blocked/{blockedUid}', () => {
  it('owner can block, list and unblock', async () => {
    const alice = asUser('alice');
    await assertSucceeds(setDoc(doc(alice, 'users/alice/blocked/bob'), { createdAt: serverTimestamp() }));
    await assertSucceeds(getDocs(collection(alice, 'users/alice/blocked')));
    await assertSucceeds(deleteDoc(doc(alice, 'users/alice/blocked/bob')));
  });

  it('other users cannot read or change the list', async () => {
    await seed('users/alice/blocked/bob', { createdAt: Timestamp.now() });
    const bob = asUser('bob');
    await assertFails(getDoc(doc(bob, 'users/alice/blocked/bob')));
    await assertFails(getDocs(collection(bob, 'users/alice/blocked')));
    await assertFails(deleteDoc(doc(bob, 'users/alice/blocked/bob')));
    await assertFails(setDoc(doc(bob, 'users/alice/blocked/carol'), { createdAt: serverTimestamp() }));
  });

  it("may store the blocked person's display name, within limits", async () => {
    const alice = asUser('alice');
    await assertSucceeds(setDoc(doc(alice, 'users/alice/blocked/bob'), { createdAt: serverTimestamp(), name: 'Bob' }));
    await assertFails(setDoc(doc(alice, 'users/alice/blocked/carol'), { createdAt: serverTimestamp(), name: '' }));
    await assertFails(
      setDoc(doc(alice, 'users/alice/blocked/carol'), { createdAt: serverTimestamp(), name: 'x'.repeat(101) })
    );
    await assertFails(setDoc(doc(alice, 'users/alice/blocked/carol'), { createdAt: serverTimestamp(), name: 42 }));
  });

  it('rejects extra fields, client timestamps and blocking yourself', async () => {
    const alice = asUser('alice');
    await assertFails(setDoc(doc(alice, 'users/alice/blocked/bob'), { createdAt: serverTimestamp(), note: 'x' }));
    await assertFails(setDoc(doc(alice, 'users/alice/blocked/bob'), { createdAt: Timestamp.fromMillis(0) }));
    await assertFails(setDoc(doc(alice, 'users/alice/blocked/alice'), { createdAt: serverTimestamp() }));
  });
});

// ------------------------------------------------------------------ babies

describe('babies', () => {
  const baby = { id: 'b1', name: 'Aria', birthDate: Timestamp.now(), status: 'active' };

  it('lets the owner create and read a baby and log feeds, diapers, sleep, growth, health and chat', async () => {
    const alice = asUser('alice');
    await assertSucceeds(setDoc(doc(alice, 'users/alice/babies/b1'), baby));
    await assertSucceeds(getDoc(doc(alice, 'users/alice/babies/b1')));
    for (const sub of ['activities', 'growth', 'health', 'chatMessages']) {
      await assertSucceeds(setDoc(doc(alice, `users/alice/babies/b1/${sub}/x`), { createdAt: Timestamp.now() }));
      await assertSucceeds(getDocs(collection(alice, `users/alice/babies/b1/${sub}`)));
      await assertSucceeds(deleteDoc(doc(alice, `users/alice/babies/b1/${sub}/x`)));
    }
    await assertSucceeds(deleteDoc(doc(alice, 'users/alice/babies/b1')));
  });

  it("keeps a baby's journal private to its owner", async () => {
    await seed('users/alice/babies/b1', baby);
    await seed('users/alice/babies/b1/activities/a1', { type: 'feeding', startedAt: Timestamp.now() });
    const bob = asUser('bob');
    await assertFails(getDoc(doc(bob, 'users/alice/babies/b1')));
    await assertFails(getDocs(collection(bob, 'users/alice/babies/b1/activities')));
    await assertFails(setDoc(doc(bob, 'users/alice/babies/b1/activities/a2'), { type: 'diaper' }));
    await assertFails(getDoc(doc(asGuest(), 'users/alice/babies/b1')));
  });

  it("lets the owner switch currentMode to 'baby' on their profile", async () => {
    await seed('users/alice', { email: 'a@x.com', name: 'Alice', currentMode: 'pregnancy' });
    await assertSucceeds(updateDoc(doc(asUser('alice'), 'users/alice'), { currentMode: 'baby' }));
  });
});

// ------------------------------------------------------------ pregnancyWeeks

describe('pregnancyWeeks', () => {
  it('is readable by signed-in users only and never client-writable', async () => {
    await seed('pregnancyWeeks/week12', { babySize: 'Lime' });
    await assertSucceeds(getDoc(doc(asUser('alice'), 'pregnancyWeeks/week12')));
    await assertFails(getDoc(doc(asGuest(), 'pregnancyWeeks/week12')));
    await assertFails(setDoc(doc(asUser('alice'), 'pregnancyWeeks/week13'), { babySize: 'Peach' }));
    await assertFails(updateDoc(doc(asUser('alice'), 'pregnancyWeeks/week12'), { babySize: 'Melon' }));
  });
});

// ----------------------------------------------------------------- community

describe('communityPosts create', () => {
  it('accepts a valid post (with and without a week tag)', async () => {
    const alice = asUser('alice');
    await assertSucceeds(setDoc(doc(alice, 'communityPosts/p1'), validPost('alice', 'p1')));
    const { pregnancyWeek, ...noWeek } = validPost('alice', 'p2');
    await assertSucceeds(setDoc(doc(alice, 'communityPosts/p2'), noWeek));
  });

  it('accepts content at exactly 2000 characters', async () => {
    await assertSucceeds(
      setDoc(doc(asUser('alice'), 'communityPosts/p1'), validPost('alice', 'p1', { content: 'a'.repeat(2000) }))
    );
  });

  it('rejects content that is too long or empty', async () => {
    const alice = asUser('alice');
    await assertFails(setDoc(doc(alice, 'communityPosts/p1'), validPost('alice', 'p1', { content: 'a'.repeat(2001) })));
    await assertFails(setDoc(doc(alice, 'communityPosts/p1'), validPost('alice', 'p1', { content: '' })));
    await assertFails(setDoc(doc(alice, 'communityPosts/p1'), validPost('alice', 'p1', { content: 42 })));
  });

  it('rejects unexpected keys', async () => {
    await assertFails(
      setDoc(doc(asUser('alice'), 'communityPosts/p1'), validPost('alice', 'p1', { isPinned: true }))
    );
  });

  it('rejects a spoofed author', async () => {
    await assertFails(setDoc(doc(asUser('alice'), 'communityPosts/p1'), validPost('bob', 'p1')));
  });

  it('rejects non-zero starting counters, client timestamps and a mismatched id', async () => {
    const alice = asUser('alice');
    await assertFails(setDoc(doc(alice, 'communityPosts/p1'), validPost('alice', 'p1', { likesCount: 99 })));
    await assertFails(setDoc(doc(alice, 'communityPosts/p1'), validPost('alice', 'p1', { commentsCount: 1 })));
    await assertFails(
      setDoc(doc(alice, 'communityPosts/p1'), validPost('alice', 'p1', { createdAt: Timestamp.fromMillis(0) }))
    );
    await assertFails(setDoc(doc(alice, 'communityPosts/p1'), validPost('alice', 'other-id')));
    await assertFails(setDoc(doc(alice, 'communityPosts/p1'), validPost('alice', 'p1', { pregnancyWeek: 99 })));
  });

  it('rejects guests', async () => {
    await assertFails(setDoc(doc(asGuest(), 'communityPosts/p1'), validPost('alice', 'p1')));
  });
});

describe('communityPosts update', () => {
  beforeEach(() => seed('communityPosts/p1', seededPost('alice')));

  it('lets anyone signed in move likesCount/commentsCount by exactly 1', async () => {
    const bob = asUser('bob');
    await assertSucceeds(updateDoc(doc(bob, 'communityPosts/p1'), { likesCount: increment(1) }));
    await assertSucceeds(updateDoc(doc(bob, 'communityPosts/p1'), { likesCount: increment(-1) }));
    await assertSucceeds(updateDoc(doc(bob, 'communityPosts/p1'), { commentsCount: increment(1) }));
    await assertSucceeds(updateDoc(doc(bob, 'communityPosts/p1'), { commentsCount: increment(-1) }));
  });

  it('rejects jumps larger than 1 or touching both counters at once', async () => {
    const bob = asUser('bob');
    await assertFails(updateDoc(doc(bob, 'communityPosts/p1'), { likesCount: increment(5) }));
    await assertFails(updateDoc(doc(bob, 'communityPosts/p1'), { likesCount: 1000 }));
    await assertFails(updateDoc(doc(bob, 'communityPosts/p1'), { commentsCount: 0 }));
    await assertFails(
      updateDoc(doc(bob, 'communityPosts/p1'), { likesCount: increment(1), commentsCount: increment(1) })
    );
  });

  it('lets only the author edit content, with validation', async () => {
    const alice = asUser('alice');
    await assertSucceeds(
      updateDoc(doc(alice, 'communityPosts/p1'), { content: 'Edited', updatedAt: serverTimestamp() })
    );
    await assertFails(
      updateDoc(doc(alice, 'communityPosts/p1'), { content: 'a'.repeat(2001), updatedAt: serverTimestamp() })
    );
    await assertFails(updateDoc(doc(alice, 'communityPosts/p1'), { userId: 'bob', updatedAt: serverTimestamp() }));
    await assertFails(
      updateDoc(doc(asUser('bob'), 'communityPosts/p1'), { content: 'Hijacked', updatedAt: serverTimestamp() })
    );
  });

  it('lets only the author delete', async () => {
    await assertFails(deleteDoc(doc(asUser('bob'), 'communityPosts/p1')));
    await assertSucceeds(deleteDoc(doc(asUser('alice'), 'communityPosts/p1')));
  });
});

describe('communityPosts/{id}/comments', () => {
  beforeEach(() => seed('communityPosts/p1', seededPost('alice')));

  it('accepts a valid comment', async () => {
    await assertSucceeds(addDoc(collection(asUser('bob'), 'communityPosts/p1/comments'), validComment('bob')));
  });

  it('rejects too long, spoofed, extra-key and backdated comments', async () => {
    const comments = collection(asUser('bob'), 'communityPosts/p1/comments');
    await assertFails(addDoc(comments, validComment('bob', { content: 'a'.repeat(1001) })));
    await assertFails(addDoc(comments, validComment('bob', { content: '' })));
    await assertFails(addDoc(comments, validComment('alice')));
    await assertFails(addDoc(comments, validComment('bob', { likes: 3 })));
    await assertFails(addDoc(comments, validComment('bob', { createdAt: Timestamp.fromMillis(0) })));
  });

  it('only the comment author can delete; nobody can edit', async () => {
    await seed('communityPosts/p1/comments/c1', { ...validComment('bob'), createdAt: Timestamp.now() });
    await assertFails(updateDoc(doc(asUser('bob'), 'communityPosts/p1/comments/c1'), { content: 'edit' }));
    await assertFails(deleteDoc(doc(asUser('carol'), 'communityPosts/p1/comments/c1')));
    await assertSucceeds(deleteDoc(doc(asUser('bob'), 'communityPosts/p1/comments/c1')));
  });

  it("moderators can remove anyone's comment and post", async () => {
    await seed('communityPosts/p1/comments/c1', { ...validComment('bob'), createdAt: Timestamp.now() });
    await assertSucceeds(deleteDoc(doc(asModerator('mod'), 'communityPosts/p1/comments/c1')));
    await assertSucceeds(deleteDoc(doc(asModerator('mod'), 'communityPosts/p1')));
  });
});

// ------------------------------------------------------------------- reports

describe('reports', () => {
  const report = (uid: string, overrides: Record<string, unknown> = {}) => ({
    reporterId: uid,
    targetType: 'post',
    postId: 'p1',
    reason: 'spam',
    createdAt: serverTimestamp(),
    ...overrides,
  });

  it('signed-in users can file post and comment reports', async () => {
    const reports = collection(asUser('bob'), 'reports');
    await assertSucceeds(addDoc(reports, report('bob')));
    await assertSucceeds(
      addDoc(reports, report('bob', { targetType: 'comment', commentId: 'c1', reason: 'misinformation' }))
    );
  });

  it('rejects spoofed reporters, unknown reasons/targets, extra keys and guests', async () => {
    const reports = collection(asUser('bob'), 'reports');
    await assertFails(addDoc(reports, report('alice')));
    await assertFails(addDoc(reports, report('bob', { reason: 'i-dont-like-it' })));
    await assertFails(addDoc(reports, report('bob', { targetType: 'user' })));
    await assertFails(addDoc(reports, report('bob', { targetType: 'comment' }))); // missing commentId
    await assertFails(addDoc(reports, report('bob', { details: 'x' })));
    await assertFails(addDoc(reports, report('bob', { createdAt: Timestamp.fromMillis(0) })));
    await assertFails(addDoc(collection(asGuest(), 'reports'), report('bob')));
  });

  it('moderators can read the queue and close a report, status fields only', async () => {
    await seed('reports/r1', { ...report('bob'), createdAt: Timestamp.now() });
    const mod = asModerator('mod');
    await assertSucceeds(getDocs(collection(mod, 'reports')));
    await assertSucceeds(
      updateDoc(doc(mod, 'reports/r1'), { status: 'dismissed', resolvedBy: 'mod', resolvedAt: serverTimestamp() })
    );
    await assertFails(
      updateDoc(doc(mod, 'reports/r1'), { status: 'removed', resolvedBy: 'someone-else', resolvedAt: serverTimestamp() })
    );
    await assertFails(
      updateDoc(doc(mod, 'reports/r1'), { status: 'open', resolvedBy: 'mod', resolvedAt: serverTimestamp() })
    );
    await assertFails(updateDoc(doc(mod, 'reports/r1'), { reason: 'other' }));
    await assertFails(deleteDoc(doc(mod, 'reports/r1')));
  });

  it('are create-only for everyone else: no read, update or delete (even by the reporter)', async () => {
    await seed('reports/r1', { ...report('bob'), createdAt: Timestamp.now() });
    const bob = asUser('bob');
    await assertFails(getDoc(doc(bob, 'reports/r1')));
    await assertFails(getDocs(collection(bob, 'reports')));
    await assertFails(updateDoc(doc(bob, 'reports/r1'), { reason: 'other' }));
    await assertFails(deleteDoc(doc(bob, 'reports/r1')));
  });
});

describe('everything else', () => {
  it('is denied by default', async () => {
    await assertFails(setDoc(doc(asUser('alice'), 'somethingNew/x'), { a: 1 }));
    await assertFails(getDoc(doc(asUser('alice'), 'somethingNew/x')));
  });
});
