/**
 * Seed comprehensive test data for the test user so every feature can be exercised.
 *
 * Usage:
 *   node --env-file=.env scripts/seedTestUser.mjs
 *
 * Signs in (or creates) test@newlifejournal.app, ensures an active pregnancy, and
 * seeds visits, symptoms, milestones, kick sessions, contraction sessions, the
 * checklist, a birth plan, and community posts. Idempotent: subcollections that
 * already contain data are left untouched, so re-running will not duplicate.
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';

const EMAIL = process.env.SEED_EMAIL || 'qa@newlifejournal.app';
const PASSWORD = process.env.SEED_PASSWORD || 'TestUser12345!';
const NAME = 'Test User';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const DAY = 24 * 60 * 60 * 1000;
const now = new Date();
const daysAgo = (d) => new Date(now.getTime() - d * DAY);
const tsFromDaysAgo = (d) => Timestamp.fromDate(daysAgo(d));

// ---- Pregnancy timing: due in 35 days => current week ~35 (third trimester) ----
const dueDate = new Date(now.getTime() + 35 * DAY);
const conceptionMs = dueDate.getTime() - 280 * DAY;
const weekAt = (date) =>
  Math.max(1, Math.min(40, Math.floor((date.getTime() - conceptionMs) / (7 * DAY)) + 1));
const currentWeek = weekAt(now);

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------
const hospitalVisits = [
  { type: 'checkup', daysAgo: 245, notes: 'First prenatal visit. Confirmed pregnancy. Discussed prenatal vitamins and diet.' },
  { type: 'test', daysAgo: 240, notes: 'Blood work and initial screening tests completed.', weight: 61, bloodPressure: '118/75' },
  { type: 'ultrasound', daysAgo: 230, notes: 'First ultrasound! Saw the heartbeat. Everything looks great!' },
  { type: 'checkup', daysAgo: 220, notes: 'Regular checkup. Baby is growing well. Morning sickness discussed.', weight: 62, bloodPressure: '120/78' },
  { type: 'test', daysAgo: 200, notes: 'Glucose screening test completed.' },
  { type: 'ultrasound', daysAgo: 180, notes: 'Anatomy scan! Baby is healthy. Found out the gender.' },
  { type: 'checkup', daysAgo: 160, notes: 'Feeling baby movements now. Weight and BP normal.', weight: 66, bloodPressure: '119/76' },
  { type: 'checkup', daysAgo: 140, notes: 'Everything progressing normally. Discussed birth plan options.', weight: 68, bloodPressure: '121/79' },
  { type: 'checkup', daysAgo: 120, notes: 'Third trimester begins! Baby is head down. Discussed labor signs.', weight: 70, bloodPressure: '122/80' },
  { type: 'test', daysAgo: 100, notes: 'Group B Strep test completed. Results pending.' },
  { type: 'checkup', daysAgo: 80, notes: 'Weekly visits start now. Baby is doing great.', weight: 72, bloodPressure: '123/81' },
  { type: 'checkup', daysAgo: 60, notes: 'Cervix check. Not dilated yet. Baby in good position.', weight: 74, bloodPressure: '124/82' },
  { type: 'ultrasound', daysAgo: 40, notes: 'Growth scan. Baby estimated at 6.5 lbs. Good fluid levels.' },
  { type: 'checkup', daysAgo: 20, notes: '1cm dilated. Baby could come any day now!', weight: 76, bloodPressure: '125/83' },
  { type: 'checkup', daysAgo: 7, notes: 'Latest checkup. 2cm dilated. Discussed induction if needed.', weight: 77, bloodPressure: '126/84' },
];

const symptoms = [
  { type: 'nausea', severity: 4, daysAgo: 243, notes: 'Morning sickness started. Very nauseated in the mornings.' },
  { type: 'fatigue', severity: 5, daysAgo: 241, notes: 'Extremely tired. Need naps during the day.' },
  { type: 'nausea', severity: 5, daysAgo: 238, notes: 'Morning sickness worse. Can barely eat.' },
  { type: 'headache', severity: 3, daysAgo: 233, notes: 'Mild headache. Drinking more water.' },
  { type: 'fatigue', severity: 4, daysAgo: 228, notes: 'Still very tired but managing.' },
  { type: 'nausea', severity: 3, daysAgo: 223, notes: 'Nausea improving slightly. Found crackers help.' },
  { type: 'nausea', severity: 2, daysAgo: 213, notes: 'Much better! Morning sickness easing up.' },
  { type: 'fatigue', severity: 2, daysAgo: 200, notes: 'Energy returning! Feeling much better.' },
  { type: 'back_pain', severity: 2, daysAgo: 190, notes: 'Slight back pain starting. Using support pillow.' },
  { type: 'headache', severity: 2, daysAgo: 180, notes: 'Occasional headaches. Managing with rest.' },
  { type: 'other', severity: 1, daysAgo: 170, notes: 'Leg cramps at night. Taking magnesium.' },
  { type: 'back_pain', severity: 3, daysAgo: 160, notes: 'Back pain increasing. Started prenatal yoga.' },
  { type: 'other', severity: 2, daysAgo: 150, notes: 'Heartburn after meals. Eating smaller portions.' },
  { type: 'fatigue', severity: 2, daysAgo: 140, notes: 'Getting tired more easily as belly grows.' },
  { type: 'back_pain', severity: 4, daysAgo: 120, notes: 'Lower back pain worse. Using heating pad.' },
  { type: 'other', severity: 3, daysAgo: 110, notes: 'Swelling in feet and ankles. Elevating feet helps.' },
  { type: 'fatigue', severity: 3, daysAgo: 100, notes: 'Hard to get comfortable at night. Using many pillows.' },
  { type: 'other', severity: 3, daysAgo: 90, notes: 'Shortness of breath when climbing stairs.' },
  { type: 'back_pain', severity: 4, daysAgo: 80, notes: 'Pelvic pressure increasing. Baby dropping.' },
  { type: 'other', severity: 4, daysAgo: 70, notes: 'Braxton Hicks contractions. Practice contractions.' },
  { type: 'fatigue', severity: 4, daysAgo: 60, notes: "Very uncomfortable. Can't sleep well." },
  { type: 'other', severity: 2, daysAgo: 50, notes: 'Nesting instinct strong! Cleaning everything.' },
  { type: 'back_pain', severity: 5, daysAgo: 40, notes: 'Lower back very sore. Baby is big now.' },
  { type: 'other', severity: 3, daysAgo: 30, notes: 'Frequent urination. Baby on bladder.' },
  { type: 'fatigue', severity: 5, daysAgo: 20, notes: 'Exhausted. Ready for baby to arrive.' },
  { type: 'other', severity: 3, daysAgo: 10, notes: 'Lost mucus plug. Labor signs appearing.' },
  { type: 'back_pain', severity: 4, daysAgo: 5, notes: 'Constant back ache. Baby engaged in pelvis.' },
];

const milestones = [
  { daysAgo: 250, title: 'Positive pregnancy test!', description: 'We are going to be parents!' },
  { daysAgo: 230, title: 'First heartbeat', description: 'Heard the heartbeat at our first ultrasound.' },
  { daysAgo: 189, title: 'End of first trimester', description: 'Made it through the toughest weeks.' },
  { daysAgo: 180, title: "It's official — gender reveal!", description: 'Anatomy scan looked perfect.' },
  { daysAgo: 165, title: 'First kick felt', description: 'Little flutters turned into real kicks.' },
  { daysAgo: 112, title: 'Viability milestone', description: 'Reached 24 weeks.' },
  { daysAgo: 84, title: 'Third trimester!', description: 'The home stretch begins.' },
  { daysAgo: 21, title: 'Hospital bag packed', description: 'Ready to go whenever baby is.' },
];

const kickSessions = [
  { daysAgo: 30, kickCount: 10, durationMinutes: 22, notes: 'Very active after breakfast.' },
  { daysAgo: 18, kickCount: 10, durationMinutes: 15, notes: 'Reached 10 kicks quickly this evening.' },
  { daysAgo: 9, kickCount: 8, durationMinutes: 41, notes: 'A bit sleepy today, took longer.' },
  { daysAgo: 3, kickCount: 10, durationMinutes: 18, notes: 'Strong kicks after a cold drink.' },
];

function buildContractionSession(dayOffset, count, avgDurSec, avgIntervalSec) {
  const start = daysAgo(dayOffset);
  const contractions = [];
  let cursor = start.getTime();
  for (let i = 0; i < count; i++) {
    const durationSeconds = avgDurSec + (i % 3) * 5;
    const startTime = new Date(cursor);
    const endTime = new Date(cursor + durationSeconds * 1000);
    contractions.push({
      startTime: Timestamp.fromDate(startTime),
      endTime: Timestamp.fromDate(endTime),
      durationSeconds,
      ...(i > 0 ? { intervalSeconds: avgIntervalSec } : {}),
    });
    cursor += durationSeconds * 1000 + avgIntervalSec * 1000;
  }
  const totalMs = cursor - start.getTime();
  return {
    date: Timestamp.fromDate(start),
    week: weekAt(start),
    contractions,
    durationMinutes: Math.round(totalMs / 60000),
    averageDurationSeconds: avgDurSec + 5,
    averageIntervalSeconds: avgIntervalSec,
    notes:
      dayOffset <= 2
        ? 'Getting closer together — timing them carefully.'
        : 'Braxton Hicks practice contractions, irregular.',
  };
}

const contractionSessions = [
  buildContractionSession(6, 5, 45, 600), // Braxton Hicks, far apart
  buildContractionSession(1, 6, 65, 280), // meets 5-1-1 territory
];

// Checklist items (by name) to mark as done after initializing defaults
const checkedItemNames = new Set([
  'Crib or bassinet',
  'Mattress and waterproof cover',
  'Baby monitor',
  'Onesies (newborn & 0-3M)',
  'Swaddle blankets',
  'Bottles (4–6)',
  'Infant car seat',
  'Insurance cards and ID',
  'Birth plan',
  'Phone charger',
]);

const DEFAULT_CHECKLIST = [
  { category: 'Nursery', name: 'Crib or bassinet' },
  { category: 'Nursery', name: 'Mattress and waterproof cover' },
  { category: 'Nursery', name: 'Baby monitor' },
  { category: 'Nursery', name: 'Changing table or pad' },
  { category: 'Nursery', name: 'Dresser or storage' },
  { category: 'Clothing', name: 'Onesies (newborn & 0-3M)' },
  { category: 'Clothing', name: 'Sleepers / footie pajamas' },
  { category: 'Clothing', name: 'Hats and mittens' },
  { category: 'Clothing', name: 'Socks (6+ pairs)' },
  { category: 'Clothing', name: 'Swaddle blankets' },
  { category: 'Feeding', name: 'Bottles (4–6)' },
  { category: 'Feeding', name: 'Breast pump' },
  { category: 'Feeding', name: 'Nursing bras (2–3)' },
  { category: 'Feeding', name: 'Burp cloths (6+)' },
  { category: 'Feeding', name: 'Baby formula (if not breastfeeding)' },
  { category: 'Health & Safety', name: 'Baby thermometer' },
  { category: 'Health & Safety', name: 'Nail clippers / file' },
  { category: 'Health & Safety', name: 'Baby first aid kit' },
  { category: 'Health & Safety', name: 'Baby-safe laundry detergent' },
  { category: 'Health & Safety', name: 'Cabinet locks and outlet covers' },
  { category: 'Travel', name: 'Infant car seat' },
  { category: 'Travel', name: 'Stroller' },
  { category: 'Travel', name: 'Baby carrier / wrap' },
  { category: 'Travel', name: 'Diaper bag' },
  { category: 'Hospital Bag', name: 'Insurance cards and ID' },
  { category: 'Hospital Bag', name: 'Birth plan' },
  { category: 'Hospital Bag', name: 'Comfortable clothes for labor' },
  { category: 'Hospital Bag', name: 'Toiletries' },
  { category: 'Hospital Bag', name: 'Going-home outfit for baby' },
  { category: 'Hospital Bag', name: 'Phone charger' },
];

const CUSTOM_CHECKLIST = [
  { category: 'Nursery', name: 'Blackout curtains', checked: true },
  { category: 'Hospital Bag', name: 'Snacks for partner', checked: false },
];

const birthPlanSections = [
  {
    title: 'Pain Management',
    selectedOptions: ['Epidural', 'Massage and breathing techniques'],
    notes: 'Open to an epidural but would like to try breathing techniques first.',
  },
  {
    title: 'Labor Preferences',
    selectedOptions: ['Freedom to move and walk', 'Dim lighting preferred', 'Music playing'],
    notes: 'Calming playlist is saved on my phone.',
  },
  {
    title: 'Delivery Preferences',
    selectedOptions: ['Delayed cord clamping', 'Immediate skin-to-skin contact', 'Partner to cut umbilical cord'],
    notes: '',
  },
  {
    title: 'After Delivery',
    selectedOptions: ['Breastfeeding immediately', 'Rooming in (baby stays with me)'],
    notes: 'Would like lactation consultant support.',
  },
  {
    title: 'Special Requests',
    selectedOptions: ['Specific support person(s) present'],
    notes: 'Partner and my mother to be present.',
  },
];

// ---------------------------------------------------------------------------
// Seeding helpers
// ---------------------------------------------------------------------------
async function ensureEmpty(ref) {
  const snap = await getDocs(query(ref, limit(1)));
  return snap.empty;
}

async function seedCollection(label, ref, docs) {
  if (!(await ensureEmpty(ref))) {
    console.log(`  ↷ ${label}: already has data, skipping`);
    return;
  }
  const batch = writeBatch(db);
  docs.forEach((d) => batch.set(doc(ref), d));
  await batch.commit();
  console.log(`  ✓ ${label}: added ${docs.length}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('Missing Firebase env vars. Run with: node --env-file=.env scripts/seedTestUser.mjs');
  }

  // --- Auth: create or sign in ---
  let uid;
  try {
    const cred = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD);
    uid = cred.user.uid;
    console.log(`✓ Created auth user ${EMAIL} (${uid})`);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
      uid = cred.user.uid;
      console.log(`✓ Signed in existing user ${EMAIL} (${uid})`);
    } else {
      throw err;
    }
  }

  // --- User profile ---
  await setDoc(
    doc(db, 'users', uid),
    {
      email: EMAIL,
      name: NAME,
      createdAt: Timestamp.now(),
      lastLogin: Timestamp.now(),
      currentMode: 'pregnancy',
    },
    { merge: true }
  );
  console.log('✓ User profile set (currentMode: pregnancy)');

  // --- Pregnancy (reuse active if present) ---
  const pregRef = collection(db, 'users', uid, 'pregnancies');
  const activeSnap = await getDocs(query(pregRef, where('status', '==', 'active'), limit(1)));
  let pregnancyId;
  if (!activeSnap.empty) {
    pregnancyId = activeSnap.docs[0].id;
    console.log(`↷ Reusing active pregnancy (${pregnancyId})`);
  } else {
    const docRef = await addDoc(pregRef, {
      motherName: NAME,
      babyName: 'Baby Test',
      dueDate: Timestamp.fromDate(dueDate),
      conceptionDate: Timestamp.fromDate(new Date(conceptionMs)),
      currentWeek,
      hospital: 'Riverside General Hospital',
      doctorName: 'Dr. Amara Patel',
      doctorPhone: '(555) 123-4567',
      bloodType: 'O+',
      status: 'active',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await updateDoc(docRef, { id: docRef.id });
    pregnancyId = docRef.id;
    console.log(`✓ Created active pregnancy (${pregnancyId}), current week ${currentWeek}`);
  }

  const sub = (name) => collection(db, 'users', uid, 'pregnancies', pregnancyId, name);

  // --- Hospital visits ---
  await seedCollection(
    'hospitalVisits',
    sub('hospitalVisits'),
    hospitalVisits.map((v) => ({
      type: v.type,
      date: tsFromDaysAgo(v.daysAgo),
      week: weekAt(daysAgo(v.daysAgo)),
      notes: v.notes,
      ...(v.weight ? { weight: v.weight } : {}),
      ...(v.bloodPressure ? { bloodPressure: v.bloodPressure } : {}),
      pregnancyId,
      createdAt: Timestamp.now(),
    }))
  );

  // --- Symptoms ---
  await seedCollection(
    'symptoms',
    sub('symptoms'),
    symptoms.map((s) => ({
      type: s.type,
      severity: s.severity,
      date: tsFromDaysAgo(s.daysAgo),
      week: weekAt(daysAgo(s.daysAgo)),
      notes: s.notes,
      pregnancyId,
      createdAt: Timestamp.now(),
    }))
  );

  // --- Milestones ---
  await seedCollection(
    'milestones',
    sub('milestones'),
    milestones.map((m) => ({
      title: m.title,
      description: m.description,
      date: tsFromDaysAgo(m.daysAgo),
      week: weekAt(daysAgo(m.daysAgo)),
      pregnancyId,
      createdAt: Timestamp.now(),
    }))
  );

  // --- Kick sessions ---
  await seedCollection(
    'kickSessions',
    sub('kickSessions'),
    kickSessions.map((k) => ({
      date: tsFromDaysAgo(k.daysAgo),
      week: weekAt(daysAgo(k.daysAgo)),
      kickCount: k.kickCount,
      durationMinutes: k.durationMinutes,
      targetReached: k.kickCount >= 10,
      notes: k.notes,
      createdAt: Timestamp.now(),
    }))
  );

  // --- Contraction sessions ---
  await seedCollection(
    'contractionSessions',
    sub('contractionSessions'),
    contractionSessions.map((c) => ({ ...c, createdAt: Timestamp.now() }))
  );

  // --- Checklist ---
  await seedCollection(
    'checklistItems',
    sub('checklistItems'),
    [
      ...DEFAULT_CHECKLIST.map((item) => ({
        category: item.category,
        name: item.name,
        checked: checkedItemNames.has(item.name),
        isCustom: false,
        pregnancyId,
        createdAt: Timestamp.now(),
      })),
      ...CUSTOM_CHECKLIST.map((item) => ({
        category: item.category,
        name: item.name,
        checked: item.checked,
        isCustom: true,
        pregnancyId,
        createdAt: Timestamp.now(),
      })),
    ]
  );

  // --- Birth plan (single doc, safe to overwrite) ---
  const planRef = doc(db, 'users', uid, 'pregnancies', pregnancyId, 'birthPlan', 'main');
  const existingPlan = await getDoc(planRef);
  await setDoc(planRef, {
    pregnancyId,
    sections: birthPlanSections,
    updatedAt: Timestamp.now(),
    createdAt: existingPlan.exists() ? existingPlan.data().createdAt : Timestamp.now(),
  });
  console.log('  ✓ birthPlan: saved');

  // --- Community posts (only if this user has none yet) ---
  const postsRef = collection(db, 'communityPosts');
  const mine = await getDocs(query(postsRef, where('userId', '==', uid), limit(1)));
  if (mine.empty) {
    const posts = [
      { content: 'Week 35 and the nesting instinct is REAL. Reorganized the whole nursery today 🧺✨', week: 35 },
      { content: 'Any tips for third-trimester back pain? The heating pad is my best friend right now.', week: 34 },
      { content: 'We finally packed the hospital bag! Feeling so much more ready. 🎒', week: 33 },
    ];
    let firstPostId = null;
    for (const p of posts) {
      const ref = await addDoc(postsRef, {
        userId: uid,
        authorName: NAME,
        authorPhoto: null,
        content: p.content,
        pregnancyWeek: p.week,
        likesCount: 0,
        commentsCount: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      await updateDoc(ref, { id: ref.id });
      if (!firstPostId) firstPostId = ref.id;
    }
    // Add a like + comment on the first post so those features have data
    await setDoc(doc(db, 'communityPosts', firstPostId, 'likes', uid), {
      userId: uid,
      createdAt: Timestamp.now(),
    });
    await updateDoc(doc(db, 'communityPosts', firstPostId), { likesCount: 1 });
    await addDoc(collection(db, 'communityPosts', firstPostId, 'comments'), {
      userId: uid,
      authorName: NAME,
      authorPhoto: null,
      content: 'Update: found the perfect spot for the changing table!',
      createdAt: Timestamp.now(),
    });
    await updateDoc(doc(db, 'communityPosts', firstPostId), { commentsCount: 1 });
    console.log(`  ✓ communityPosts: added ${posts.length} (with 1 like + 1 comment)`);
  } else {
    console.log('  ↷ communityPosts: user already has posts, skipping');
  }

  console.log('\n✅ Done seeding test data.');
  console.log(`   Login: ${EMAIL} / ${PASSWORD}`);
  console.log(`   Pregnancy week: ${currentWeek}  |  Due: ${dueDate.toDateString()}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Seeding failed:', err);
  process.exit(1);
});
