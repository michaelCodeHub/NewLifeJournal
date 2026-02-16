import {
  collection,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

export interface WeekInfo {
  week: number;
  babySize: string;
  babyLength: string;
  babyWeight: string;
  babyDevelopment: string[];
  motherChanges: string[];
  tips: string[];
}

// Fetch week information from Firestore
export const getWeekInfo = async (week: number): Promise<WeekInfo | null> => {
  try {
    const weekDoc = doc(db, 'pregnancyWeeks', `week${week}`);
    const docSnap = await getDoc(weekDoc);

    if (docSnap.exists()) {
      return docSnap.data() as WeekInfo;
    }

    return null;
  } catch (error) {
    console.error('Error fetching week info:', error);
    return null;
  }
};

// Helper function to populate Firestore with week data (run once to initialize)
export const initializeWeekData = async () => {
  const weekData: WeekInfo[] = [
    {
      week: 4,
      babySize: 'Poppy seed',
      babyLength: '0.04 inches',
      babyWeight: 'Less than 1 gram',
      babyDevelopment: [
        'Embryo is implanting in uterine wall',
        'Amniotic sac and placenta are forming',
        'Basic neural tube is developing',
      ],
      motherChanges: [
        'Possible early pregnancy symptoms',
        'Missed period',
        'Slight spotting or cramping',
      ],
      tips: [
        'Start taking prenatal vitamins',
        'Schedule your first prenatal appointment',
        'Avoid alcohol and smoking',
      ],
    },
    {
      week: 8,
      babySize: 'Raspberry',
      babyLength: '0.63 inches',
      babyWeight: '0.04 ounces',
      babyDevelopment: [
        'All major organs are forming',
        'Webbed fingers and toes are developing',
        'Eyelids and external ears are forming',
        'Heart is beating about 150 times per minute',
      ],
      motherChanges: [
        'Morning sickness may be present',
        'Breast tenderness and sensitivity',
        'Increased urination',
        'Fatigue is common',
      ],
      tips: [
        'Eat small, frequent meals to combat nausea',
        'Stay hydrated',
        'Get plenty of rest',
      ],
    },
    {
      week: 12,
      babySize: 'Lime',
      babyLength: '2.1 inches',
      babyWeight: '0.5 ounces',
      babyDevelopment: [
        'Face is well-formed',
        'Fingernails and toenails are forming',
        'Baby can make sucking motions',
        'Reflexes are developing',
      ],
      motherChanges: [
        'Uterus is rising above pelvis',
        'Morning sickness may be easing',
        'Energy levels may increase',
        'Slight weight gain',
      ],
      tips: [
        'Consider sharing your pregnancy news',
        'Continue prenatal vitamins',
        'Stay active with gentle exercise',
      ],
    },
    {
      week: 16,
      babySize: 'Avocado',
      babyLength: '4.6 inches',
      babyWeight: '3.5 ounces',
      babyDevelopment: [
        'Facial muscles can move',
        'Eyes can slowly move',
        'Skeleton is hardening',
        'Can hear sounds from outside',
      ],
      motherChanges: [
        'May start feeling baby movements',
        'Growing belly becomes visible',
        'Increased appetite',
        'Pregnancy glow may appear',
      ],
      tips: [
        'Start doing pelvic floor exercises',
        'Eat iron-rich foods',
        'Consider maternity clothes',
      ],
    },
    {
      week: 20,
      babySize: 'Banana',
      babyLength: '6.5 inches',
      babyWeight: '10.6 ounces',
      babyDevelopment: [
        'Can hear your voice clearly',
        'Developing sleep-wake cycles',
        'Vernix (protective coating) forming',
        'Taste buds are working',
      ],
      motherChanges: [
        'Definite baby movements felt',
        'Round ligament pain possible',
        'Belly button may pop out',
        'Increased vaginal discharge',
      ],
      tips: [
        'Time for anatomy scan ultrasound',
        'Sleep on your side',
        'Stay active but avoid overexertion',
      ],
    },
    {
      week: 24,
      babySize: 'Cantaloupe',
      babyLength: '11.8 inches',
      babyWeight: '1.3 pounds',
      babyDevelopment: [
        'Lungs are developing rapidly',
        'Skin is becoming less transparent',
        'Brain is growing quickly',
        'Can respond to sounds with movement',
      ],
      motherChanges: [
        'Back pain may increase',
        'Feet and ankles may swell',
        'Braxton Hicks contractions may start',
        'Glucose screening test due',
      ],
      tips: [
        'Wear comfortable, supportive shoes',
        'Elevate feet when possible',
        'Complete glucose screening',
      ],
    },
    {
      week: 28,
      babySize: 'Eggplant',
      babyLength: '14.8 inches',
      babyWeight: '2.2 pounds',
      babyDevelopment: [
        'Can blink eyes',
        'Brain waves show REM sleep',
        'Adding body fat',
        'Can recognize your voice',
      ],
      motherChanges: [
        'Frequent urination increases',
        'Shortness of breath common',
        'Possible heartburn',
        'Vivid dreams may occur',
      ],
      tips: [
        'Start thinking about birth plan',
        'Sign up for childbirth classes',
        'Schedule appointments every 2 weeks now',
      ],
    },
    {
      week: 32,
      babySize: 'Squash',
      babyLength: '16.7 inches',
      babyWeight: '3.8 pounds',
      babyDevelopment: [
        'Practicing breathing movements',
        'Toenails are fully formed',
        'Getting into head-down position',
        'Gaining about half a pound per week',
      ],
      motherChanges: [
        'Belly is quite large',
        'May feel uncomfortable or awkward',
        'Pelvic pressure increasing',
        'Difficulty sleeping',
      ],
      tips: [
        'Practice relaxation techniques',
        'Pack your hospital bag',
        'Prepare nursery',
      ],
    },
    {
      week: 36,
      babySize: 'Romaine lettuce',
      babyLength: '18.7 inches',
      babyWeight: '5.8 pounds',
      babyDevelopment: [
        'Shedding most of the lanugo',
        'Gums are very rigid',
        'Liver and kidneys fully functioning',
        'Immune system developing',
      ],
      motherChanges: [
        'Braxton Hicks more frequent',
        'Possible leaking colostrum',
        'Baby has dropped lower',
        'Weekly doctor visits begin',
      ],
      tips: [
        'Finalize birth plan',
        'Pre-register at hospital',
        'Install car seat',
      ],
    },
    {
      week: 40,
      babySize: 'Watermelon',
      babyLength: '20 inches',
      babyWeight: '7.5 pounds',
      babyDevelopment: [
        'Fully developed and ready for birth',
        'Skull bones not yet fused',
        'Strong muscle tone',
        'Coordinated reflexes',
      ],
      motherChanges: [
        'May lose mucus plug',
        'Water may break',
        'Contractions may start',
        'Anxious and excited',
      ],
      tips: [
        'Watch for labor signs',
        'Rest as much as possible',
        'Stay in touch with your doctor',
      ],
    },
  ];

  try {
    for (const info of weekData) {
      const weekDoc = doc(db, 'pregnancyWeeks', `week${info.week}`);
      await setDoc(weekDoc, info);
    }
    console.log('Week data initialized successfully!');
  } catch (error) {
    console.error('Error initializing week data:', error);
    throw error;
  }
};
