import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';

// Firebase config - you'll need to add your actual config
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper to create a date in the past
const daysAgo = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

// Helper to calculate week from days ago
const getWeekFromDaysAgo = (days: number): number => {
  // Assuming pregnancy started ~280 days ago (40 weeks)
  const totalDays = 280;
  const currentDay = totalDays - days;
  return Math.max(1, Math.min(40, Math.floor(currentDay / 7)));
};

const hospitalVisits = [
  // First Trimester
  {
    type: 'checkup' as const,
    daysAgo: 250,
    notes: 'First prenatal visit. Confirmed pregnancy. Discussed prenatal vitamins and diet.',
  },
  {
    type: 'test' as const,
    daysAgo: 240,
    notes: 'Blood work and initial screening tests completed.',
  },
  {
    type: 'ultrasound' as const,
    daysAgo: 230,
    notes: 'First ultrasound! Saw the heartbeat. Everything looks great!',
  },
  {
    type: 'checkup' as const,
    daysAgo: 220,
    notes: 'Regular checkup. Baby is growing well. Morning sickness discussed.',
  },

  // Second Trimester
  {
    type: 'test' as const,
    daysAgo: 200,
    notes: 'Glucose screening test completed.',
  },
  {
    type: 'ultrasound' as const,
    daysAgo: 180,
    notes: 'Anatomy scan! Baby is healthy. Found out the gender.',
  },
  {
    type: 'checkup' as const,
    daysAgo: 160,
    notes: 'Regular checkup. Feeling baby movements now. Weight and BP normal.',
  },
  {
    type: 'checkup' as const,
    daysAgo: 140,
    notes: 'Everything progressing normally. Discussed birth plan options.',
  },

  // Third Trimester
  {
    type: 'checkup' as const,
    daysAgo: 120,
    notes: 'Third trimester begins! Baby is head down. Discussed labor signs.',
  },
  {
    type: 'test' as const,
    daysAgo: 100,
    notes: 'Group B Strep test completed. Results pending.',
  },
  {
    type: 'checkup' as const,
    daysAgo: 80,
    notes: 'Weekly visits start now. Baby is doing great.',
  },
  {
    type: 'checkup' as const,
    daysAgo: 60,
    notes: 'Cervix check. Not dilated yet. Baby in good position.',
  },
  {
    type: 'ultrasound' as const,
    daysAgo: 40,
    notes: 'Growth scan. Baby estimated at 6.5 lbs. Good fluid levels.',
  },
  {
    type: 'checkup' as const,
    daysAgo: 20,
    notes: '1cm dilated. Baby could come any day now!',
  },
  {
    type: 'checkup' as const,
    daysAgo: 7,
    notes: 'Latest checkup. 2cm dilated. Discussed induction if needed.',
  },
];

const symptoms = [
  // First Trimester Symptoms
  { type: 'nausea' as const, severity: 4, daysAgo: 245, notes: 'Morning sickness started. Very nauseated in the mornings.' },
  { type: 'fatigue' as const, severity: 5, daysAgo: 243, notes: 'Extremely tired. Need naps during the day.' },
  { type: 'nausea' as const, severity: 5, daysAgo: 240, notes: 'Morning sickness worse. Can barely eat.' },
  { type: 'headache' as const, severity: 3, daysAgo: 235, notes: 'Mild headache. Drinking more water.' },
  { type: 'fatigue' as const, severity: 4, daysAgo: 230, notes: 'Still very tired but managing.' },
  { type: 'nausea' as const, severity: 3, daysAgo: 225, notes: 'Nausea improving slightly. Found crackers help.' },
  { type: 'nausea' as const, severity: 2, daysAgo: 215, notes: 'Much better! Morning sickness easing up.' },

  // Second Trimester Symptoms
  { type: 'fatigue' as const, severity: 2, daysAgo: 200, notes: 'Energy returning! Feeling much better.' },
  { type: 'back_pain' as const, severity: 2, daysAgo: 190, notes: 'Slight back pain starting. Using support pillow.' },
  { type: 'headache' as const, severity: 2, daysAgo: 180, notes: 'Occasional headaches. Managing with rest.' },
  { type: 'other' as const, severity: 1, daysAgo: 170, notes: 'Leg cramps at night. Taking magnesium.' },
  { type: 'back_pain' as const, severity: 3, daysAgo: 160, notes: 'Back pain increasing. Started prenatal yoga.' },
  { type: 'other' as const, severity: 2, daysAgo: 150, notes: 'Heartburn after meals. Eating smaller portions.' },
  { type: 'fatigue' as const, severity: 2, daysAgo: 140, notes: 'Getting tired more easily as belly grows.' },

  // Third Trimester Symptoms
  { type: 'back_pain' as const, severity: 4, daysAgo: 120, notes: 'Lower back pain worse. Using heating pad.' },
  { type: 'other' as const, severity: 3, daysAgo: 110, notes: 'Swelling in feet and ankles. Elevating feet helps.' },
  { type: 'fatigue' as const, severity: 3, daysAgo: 100, notes: 'Hard to get comfortable at night. Using many pillows.' },
  { type: 'other' as const, severity: 3, daysAgo: 90, notes: 'Shortness of breath when climbing stairs.' },
  { type: 'back_pain' as const, severity: 4, daysAgo: 80, notes: 'Pelvic pressure increasing. Baby dropping.' },
  { type: 'other' as const, severity: 4, daysAgo: 70, notes: 'Braxton Hicks contractions. Practice contractions.' },
  { type: 'fatigue' as const, severity: 4, daysAgo: 60, notes: 'Very uncomfortable. Can\'t sleep well.' },
  { type: 'other' as const, severity: 2, daysAgo: 50, notes: 'Nesting instinct strong! Cleaning everything.' },
  { type: 'back_pain' as const, severity: 5, daysAgo: 40, notes: 'Lower back very sore. Baby is big now.' },
  { type: 'other' as const, severity: 3, daysAgo: 30, notes: 'Frequent urination. Baby on bladder.' },
  { type: 'fatigue' as const, severity: 5, daysAgo: 20, notes: 'Exhausted. Ready for baby to arrive.' },
  { type: 'other' as const, severity: 3, daysAgo: 10, notes: 'Lost mucus plug. Labor signs appearing.' },
  { type: 'back_pain' as const, severity: 4, daysAgo: 5, notes: 'Constant back ache. Baby engaged in pelvis.' },
];

async function addDummyData(userId: string, pregnancyId: string) {
  console.log('Starting to add dummy data...');
  console.log(`User ID: ${userId}`);
  console.log(`Pregnancy ID: ${pregnancyId}`);

  try {
    // Add Hospital Visits
    console.log('\nAdding hospital visits...');
    for (const visit of hospitalVisits) {
      const visitDate = daysAgo(visit.daysAgo);
      const week = getWeekFromDaysAgo(visit.daysAgo);

      const visitData = {
        type: visit.type,
        date: Timestamp.fromDate(visitDate),
        week,
        notes: visit.notes,
        pregnancyId,
        createdAt: Timestamp.now(),
      };

      await addDoc(
        collection(db, 'users', userId, 'pregnancies', pregnancyId, 'hospitalVisits'),
        visitData
      );
      console.log(`✓ Added ${visit.type} visit from ${visit.daysAgo} days ago (Week ${week})`);
    }

    // Add Symptoms
    console.log('\nAdding symptoms...');
    for (const symptom of symptoms) {
      const symptomDate = daysAgo(symptom.daysAgo);
      const week = getWeekFromDaysAgo(symptom.daysAgo);

      const symptomData = {
        type: symptom.type,
        severity: symptom.severity,
        date: Timestamp.fromDate(symptomDate),
        week,
        notes: symptom.notes,
        pregnancyId,
        createdAt: Timestamp.now(),
      };

      await addDoc(
        collection(db, 'users', userId, 'pregnancies', pregnancyId, 'symptoms'),
        symptomData
      );
      console.log(`✓ Added ${symptom.type} symptom (severity ${symptom.severity}) from ${symptom.daysAgo} days ago (Week ${week})`);
    }

    console.log('\n✅ Successfully added all dummy data!');
    console.log(`Total hospital visits: ${hospitalVisits.length}`);
    console.log(`Total symptoms: ${symptoms.length}`);

  } catch (error) {
    console.error('❌ Error adding dummy data:', error);
    throw error;
  }
}

// Main execution
async function main() {
  // Get user ID and pregnancy ID from command line arguments
  const userId = process.argv[2];
  const pregnancyId = process.argv[3];

  if (!userId || !pregnancyId) {
    console.error('Usage: ts-node addDummyData.ts <userId> <pregnancyId>');
    console.error('\nTo find your IDs:');
    console.error('1. Open your app');
    console.error('2. Check the Firebase console for your user ID');
    console.error('3. Check the pregnancies collection for your pregnancy ID');
    process.exit(1);
  }

  await addDummyData(userId, pregnancyId);
  process.exit(0);
}

main().catch(console.error);
