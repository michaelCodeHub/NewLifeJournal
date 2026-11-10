import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, admin } from './admin';

/**
 * Permanently deletes the caller's account and everything tied to it
 * (App Store 5.1.1(v) / Google Play account-deletion requirement):
 *
 *  - users/{uid} and every subcollection (pregnancies, visits, symptoms,
 *    chat history, babies, blocked list, private usage/rate docs)
 *  - their community posts (with likes/comments under them), their comments
 *    and likes on other people's posts (keeping counters consistent)
 *  - their chat attachments in Cloud Storage
 *  - the Firebase Auth user itself (last, so a partial failure can be retried)
 *
 * The client must have signed in recently: Firebase only lets a user delete
 * themselves with a fresh token, and we apply the same rule here.
 */
const RECENT_SIGN_IN_SECONDS = 15 * 60;

export const deleteAccount = onCall({ timeoutSeconds: 300, memory: '512MiB' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const uid = request.auth.uid;
  const authTime = Number(request.auth.token.auth_time ?? 0);
  if (Date.now() / 1000 - authTime > RECENT_SIGN_IN_SECONDS) {
    throw new HttpsError('failed-precondition', 'requires-recent-login');
  }

  // 1. Community: own posts (recursively, including their likes/comments).
  const posts = await db.collection('communityPosts').where('userId', '==', uid).get();
  for (const post of posts.docs) {
    await db.recursiveDelete(post.ref);
  }

  // 2. Their comments and likes on other people's posts, with counters kept in step.
  const [comments, likes] = await Promise.all([
    db.collectionGroup('comments').where('userId', '==', uid).get(),
    db.collectionGroup('likes').where('userId', '==', uid).get(),
  ]);
  const writer = db.bulkWriter();
  for (const c of comments.docs) {
    writer.delete(c.ref).catch((e) => console.error("[deleteAccount] comment", e?.message));
    const parent = c.ref.parent.parent;
    if (parent) writer.update(parent, { commentsCount: admin.firestore.FieldValue.increment(-1) }).catch(() => undefined);
  }
  for (const l of likes.docs) {
    writer.delete(l.ref).catch((e) => console.error("[deleteAccount] like", e?.message));
    const parent = l.ref.parent.parent;
    if (parent) writer.update(parent, { likesCount: admin.firestore.FieldValue.increment(-1) }).catch(() => undefined);
  }
  await writer.close();

  // 3. Everything under users/{uid}.
  await db.recursiveDelete(db.collection('users').doc(uid));

  // 4. Files.
  try {
    await admin.storage().bucket().deleteFiles({ prefix: `chatAttachments/${uid}/` });
  } catch (err: any) {
    console.error('[deleteAccount] storage cleanup failed', err?.message);
  }

  // 5. The login itself.
  await admin.auth().deleteUser(uid);

  return { ok: true };
});
