import {
  collection,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';

export interface DailyTip {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}

export interface PregnancyInfo {
  appointments: string[];
  tests: string[];
  milestones: string[];
}

export interface WeekInfo {
  week: number;
  babySize: string;
  babyLength: string;
  babyWeight: string;
  babyDevelopment: string[];
  motherChanges: string[];
  tips: string[];
  dailyTips?: DailyTip[];
  pregnancyInfo?: PregnancyInfo;
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

const getDailyTipsForWeek = (week: number): DailyTip[] => {
  // First trimester (weeks 1-13)
  if (week <= 13) {
    return [
      { title: 'Stay Hydrated', subtitle: '8-10 glasses daily', icon: '💧', color: '#E3F2FD' },
      { title: 'Take Vitamins', subtitle: 'Folic acid & prenatal', icon: '💊', color: '#F3E5F5' },
      { title: 'Rest Well', subtitle: '7-9 hours of sleep', icon: '🌙', color: '#EDE7F6' },
      { title: 'Eat Well', subtitle: 'Protein & iron-rich foods', icon: '🥗', color: '#E8F5E9' },
    ];
  }
  // Second trimester (weeks 14-26)
  if (week <= 26) {
    return [
      { title: 'Stay Hydrated', subtitle: '8-10 glasses daily', icon: '💧', color: '#E3F2FD' },
      { title: 'Eat Well', subtitle: 'Protein & iron-rich foods', icon: '🥗', color: '#E8F5E9' },
      { title: 'Rest Well', subtitle: '7-9 hours of sleep', icon: '🌙', color: '#EDE7F6' },
      { title: 'Stay Active', subtitle: '20-30 min light exercise', icon: '🏃‍♀️', color: '#FFF3E0' },
    ];
  }
  // Third trimester (weeks 27-40)
  return [
    { title: 'Stay Hydrated', subtitle: '8-10 glasses daily', icon: '💧', color: '#E3F2FD' },
    { title: 'Eat Well', subtitle: 'Small frequent meals', icon: '🥗', color: '#E8F5E9' },
    { title: 'Rest Well', subtitle: 'Sleep on your side', icon: '🌙', color: '#EDE7F6' },
    { title: 'Stay Active', subtitle: 'Gentle walks & stretches', icon: '🏃‍♀️', color: '#FFF3E0' },
  ];
};

const pregnancyInfoByWeek: Record<number, PregnancyInfo> = {
  1: { appointments: [], tests: [], milestones: ['Pregnancy counting starts from last period', 'Body preparing for ovulation'] },
  2: { appointments: [], tests: [], milestones: ['Ovulation approaching', 'Fertile window opens this week'] },
  3: { appointments: ['Consider scheduling first prenatal visit soon'], tests: ['Home pregnancy test (end of week)'], milestones: ['Conception may have occurred', 'Fertilized egg traveling to uterus'] },
  4: { appointments: ['Call OB/midwife to book first prenatal visit'], tests: ['Home pregnancy test confirms pregnancy', 'Bloodwork to confirm hCG levels (if ordered)'], milestones: ['Embryo implanting in uterine wall', 'Positive pregnancy test likely'] },
  5: { appointments: ['Book first prenatal visit (typically weeks 8–10)'], tests: ['Confirm pregnancy with home or blood test'], milestones: ['Heart and circulatory system begin forming', 'Neural tube closing'] },
  6: { appointments: ['Call OB/midwife to schedule first prenatal visit'], tests: [], milestones: ['Heartbeat may be detectable by transvaginal ultrasound'] },
  7: { appointments: ['First prenatal appointment (if scheduled early)'], tests: ['Blood type & Rh factor', 'Complete blood count (CBC)', 'Urine culture', 'STI screening'], milestones: ['All major organs beginning to form'] },
  8: { appointments: ['First prenatal visit (most common timing)'], tests: ['Blood type & Rh factor', 'CBC', 'STI and rubella screening', 'Urine culture', 'Thyroid function'], milestones: ['All major organs forming', 'Heartbeat ~150 bpm'] },
  9: { appointments: [], tests: [], milestones: ['Baby officially transitions from embryo to fetus'] },
  10: { appointments: [], tests: ['NIPT (non-invasive prenatal test) – optional, available 10+ weeks'], milestones: ['Vital organs fully formed', 'First trimester screen approaching'] },
  11: { appointments: ['Schedule nuchal translucency (NT) scan – 11 to 14 weeks'], tests: ['NT ultrasound – 11 to 14 weeks', 'NIPT results (if done at week 10)'], milestones: ['Baby almost fully formed'] },
  12: { appointments: ['Prenatal checkup'], tests: ['First trimester blood screen (PAPP-A, hCG)', 'NT ultrasound (if not yet done)'], milestones: ['End of highest miscarriage risk period', 'Many families share pregnancy news'] },
  13: { appointments: ['12 or 13-week prenatal visit'], tests: ['CVS (chorionic villus sampling) – if recommended'], milestones: ['First trimester ends', 'Risk of miscarriage drops significantly'] },
  14: { appointments: ['Prenatal appointment'], tests: [], milestones: ['Second trimester begins', 'Energy typically starts to return'] },
  15: { appointments: [], tests: ['Maternal serum AFP / quad screen – available 15 to 20 weeks'], milestones: ['Baby can respond to light'] },
  16: { appointments: ['Prenatal appointment'], tests: ['Quad screen (AFP, hCG, estriol, inhibin A) – 15 to 18 weeks', 'Amniocentesis – if recommended'], milestones: ['Baby can hear sounds', 'First movements (quickening) may be felt'] },
  17: { appointments: [], tests: [], milestones: ['Quickening (first flutters) often felt', 'Skeleton hardening from cartilage to bone'] },
  18: { appointments: ['Schedule anatomy scan (18 to 20 weeks)'], tests: ['Level 2 anatomy ultrasound (upcoming)'], milestones: ['Baby can hear your voice', 'Genitals visible on ultrasound'] },
  19: { appointments: [], tests: [], milestones: ['Baby movements clearly felt', 'Halfway through pregnancy approaching'] },
  20: { appointments: ['Anatomy scan appointment', '20-week prenatal checkup'], tests: ['Level 2 anatomy ultrasound', 'Cervical length check (if indicated)'], milestones: ['Halfway through pregnancy!', 'Anatomy scan confirms healthy development'] },
  21: { appointments: [], tests: [], milestones: ['Past the halfway point', 'Baby movements regular and noticeable'] },
  22: { appointments: ['Prenatal checkup'], tests: [], milestones: ['Baby reaches viability threshold (very premature)'] },
  23: { appointments: [], tests: [], milestones: ['Baby can survive with intensive care if born now'] },
  24: { appointments: ['Prenatal appointment – glucose screening'], tests: ['1-hour glucose challenge test (GCT) – 24 to 28 weeks', 'Blood pressure monitoring'], milestones: ['24-week viability milestone', 'Lung surfactant beginning to develop'] },
  25: { appointments: [], tests: ['3-hour glucose tolerance test (GTT) – if 1-hour GCT result was elevated'], milestones: ['Baby gains significant weight from here on'] },
  26: { appointments: ['Prenatal appointment'], tests: [], milestones: ['Baby eyes beginning to open', 'Third trimester approaching'] },
  27: { appointments: [], tests: [], milestones: ['Third trimester begins next week', 'Sleep-wake cycles established'] },
  28: { appointments: ['Prenatal appointment – biweekly visits begin'], tests: ['Glucose tolerance test (if not yet done)', 'RhoGAM injection (if Rh-negative)', 'CBC (check for anemia)', 'Tdap vaccine (whooping cough booster)', 'Flu vaccine (if in season)'], milestones: ['Third trimester begins!', 'Prenatal visits now every 2 weeks'] },
  29: { appointments: [], tests: [], milestones: ['Baby gaining weight rapidly', 'Bones fully developed but still soft'] },
  30: { appointments: ['Biweekly prenatal appointment'], tests: ['Blood pressure check', 'Fundal height measurement'], milestones: ['10 weeks until due date'] },
  31: { appointments: [], tests: [], milestones: ['Baby moving into head-down position', 'All five senses working'] },
  32: { appointments: ['Biweekly prenatal appointment', 'Growth ultrasound (if recommended)'], tests: ['Growth ultrasound scan', 'Fetal well-being assessment'], milestones: ['8 weeks until due date', 'Baby gaining ~½ lb per week'] },
  33: { appointments: [], tests: [], milestones: ['Brain and nervous system fully developed', 'Immune system strengthening from antibodies'] },
  34: { appointments: ['Biweekly prenatal appointment'], tests: ['Non-stress test (NST) – if indicated'], milestones: ['6 weeks until due date', 'Most babies head-down by now'] },
  35: { appointments: ['Group B Strep (GBS) test appointment – 35 to 37 weeks'], tests: ['GBS culture – 35 to 37 weeks', 'Non-stress test (NST) – if indicated'], milestones: ['Baby gaining 1 oz/day', 'Most physical development complete'] },
  36: { appointments: ['Weekly prenatal visits begin', 'Pre-register at hospital'], tests: ['Cervical checks begin (optional)', 'GBS results confirmed'], milestones: ['Baby drops into pelvis (lightening)', 'Weekly doctor visits begin'] },
  37: { appointments: ['Weekly prenatal appointment'], tests: ['Cervical dilation and effacement check', 'Fetal position confirmed'], milestones: ['Officially full term!', 'Baby could arrive any day after this week'] },
  38: { appointments: ['Weekly prenatal appointment'], tests: ['Cervical dilation and effacement check', 'Membrane sweep (optional, if overdue)'], milestones: ['Lungs and digestive system fully ready', 'Baby fully prepared for birth'] },
  39: { appointments: ['Weekly prenatal appointment'], tests: ['Biophysical profile (BPP) – if indicated', 'NST – if indicated', 'Induction discussion if approaching post-dates'], milestones: ['Full-term pregnancy', '1 week until due date'] },
  40: { appointments: ['Due date appointment', 'Induction scheduling (if needed)'], tests: ['Biophysical profile', 'NST', 'Membrane sweep or induction discussion'], milestones: ['Due date!', 'Labor expected any day', 'Post-dates monitoring begins if needed'] },
};

// Helper function to populate Firestore with week data (run once to initialize)
export const initializeWeekData = async () => {
  const weekData: WeekInfo[] = [
    {
      week: 1,
      babySize: 'Not yet conceived',
      babyLength: 'N/A',
      babyWeight: 'N/A',
      babyDevelopment: [
        'This week marks the beginning of your menstrual cycle',
        'Your body is preparing for ovulation',
        'Pregnancy is calculated from the first day of your last period',
      ],
      motherChanges: [
        'Menstrual period begins',
        'Hormone levels are resetting',
        'Uterine lining is shedding',
      ],
      tips: [
        'Start taking folic acid supplements',
        'Maintain a healthy diet',
        'Avoid smoking and alcohol',
        'Track your menstrual cycle',
      ],
    },
    {
      week: 2,
      babySize: 'Not yet conceived',
      babyLength: 'N/A',
      babyWeight: 'N/A',
      babyDevelopment: [
        'Ovulation is approaching',
        'Egg is maturing in the ovary',
        'Conception may occur at the end of this week',
      ],
      motherChanges: [
        'Menstrual period ends',
        'Estrogen levels rising',
        'Cervical mucus becomes fertile',
        'Energy levels may increase',
      ],
      tips: [
        'Continue taking folic acid',
        'Track ovulation if trying to conceive',
        'Maintain healthy lifestyle habits',
        'Stay hydrated and well-rested',
      ],
    },
    {
      week: 3,
      babySize: 'Pinhead',
      babyLength: '0.004 inches',
      babyWeight: 'Microscopic',
      babyDevelopment: [
        'Fertilization occurs',
        'Cells are rapidly dividing',
        'Embryo is traveling to the uterus',
        'Implantation begins',
      ],
      motherChanges: [
        'No noticeable symptoms yet',
        'Hormone levels beginning to change',
        'Very early pregnancy signs possible',
      ],
      tips: [
        'Continue prenatal vitamins',
        'Avoid harmful substances',
        'Maintain healthy eating habits',
        'Get adequate rest',
      ],
    },
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
      week: 5,
      babySize: 'Sesame seed',
      babyLength: '0.05 inches',
      babyWeight: 'Less than 1 gram',
      babyDevelopment: [
        'Heart and circulatory system forming',
        'Neural tube is closing',
        'Tiny buds that will become arms and legs appear',
      ],
      motherChanges: [
        'Morning sickness may begin',
        'Breast tenderness',
        'Increased fatigue',
        'Frequent urination',
      ],
      tips: [
        'Take a pregnancy test if you haven\'t',
        'Schedule your first prenatal visit',
        'Eat small, frequent meals',
        'Stay hydrated',
      ],
    },
    {
      week: 6,
      babySize: 'Lentil',
      babyLength: '0.25 inches',
      babyWeight: 'Less than 1 gram',
      babyDevelopment: [
        'Heart begins to beat',
        'Facial features are forming',
        'Small buds for arms and legs visible',
        'Brain and spine developing rapidly',
      ],
      motherChanges: [
        'Morning sickness intensifies',
        'Mood swings common',
        'Increased sense of smell',
        'Bloating',
      ],
      tips: [
        'Eat bland foods if nauseous',
        'Avoid strong odors',
        'Rest when needed',
        'Drink plenty of water',
      ],
    },
    {
      week: 7,
      babySize: 'Blueberry',
      babyLength: '0.51 inches',
      babyWeight: '0.03 ounces',
      babyDevelopment: [
        'Arms and legs are lengthening',
        'Brain is developing rapidly',
        'Hands and feet are forming',
        'Eyes and nostrils appear',
      ],
      motherChanges: [
        'Continued morning sickness',
        'Emotional ups and downs',
        'Increased saliva production',
        'Food aversions or cravings',
      ],
      tips: [
        'Keep crackers by your bedside',
        'Wear comfortable clothing',
        'Avoid triggers for nausea',
        'Consider vitamin B6 for nausea',
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
      week: 9,
      babySize: 'Grape',
      babyLength: '0.9 inches',
      babyWeight: '0.07 ounces',
      babyDevelopment: [
        'Tail has disappeared',
        'All essential organs have formed',
        'Fingers and toes are distinct',
        'Muscles are developing',
      ],
      motherChanges: [
        'Waistline may start to expand',
        'Continued fatigue and nausea',
        'Veins more visible',
        'Mood swings persist',
      ],
      tips: [
        'Invest in supportive bras',
        'Eat nutrient-dense foods',
        'Continue prenatal vitamins',
        'Stay active with gentle exercise',
      ],
    },
    {
      week: 10,
      babySize: 'Kumquat',
      babyLength: '1.2 inches',
      babyWeight: '0.14 ounces',
      babyDevelopment: [
        'Vital organs are fully formed',
        'Bones and cartilage forming',
        'Tiny teeth buds appearing',
        'Baby can make small movements',
      ],
      motherChanges: [
        'Morning sickness may peak',
        'Clothes feeling tighter',
        'Emotional changes continue',
        'Skin changes possible',
      ],
      tips: [
        'Eat protein-rich foods',
        'Stay hydrated',
        'Wear loose, comfortable clothing',
        'Practice stress-relief techniques',
      ],
    },
    {
      week: 11,
      babySize: 'Fig',
      babyLength: '1.6 inches',
      babyWeight: '0.25 ounces',
      babyDevelopment: [
        'Baby is almost fully formed',
        'Hair follicles are forming',
        'Fingers and toes separating',
        'Genitals are developing',
      ],
      motherChanges: [
        'Increased energy may begin',
        'Morning sickness may ease soon',
        'Slight weight gain',
        'Increased vaginal discharge',
      ],
      tips: [
        'Schedule your first ultrasound if not done',
        'Stay active with walking or swimming',
        'Maintain healthy eating habits',
        'Get adequate sleep',
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
      week: 13,
      babySize: 'Peach',
      babyLength: '2.9 inches',
      babyWeight: '0.81 ounces',
      babyDevelopment: [
        'Vocal cords are forming',
        'Intestines moving into abdomen',
        'Baby can hiccup',
        'Unique fingerprints forming',
      ],
      motherChanges: [
        'Second trimester begins',
        'Energy returning',
        'Morning sickness subsiding',
        'Baby bump becoming visible',
      ],
      tips: [
        'Start planning maternity wardrobe',
        'Continue healthy eating',
        'Stay active with approved exercises',
        'Consider pregnancy massage',
      ],
    },
    {
      week: 14,
      babySize: 'Lemon',
      babyLength: '3.4 inches',
      babyWeight: '1.5 ounces',
      babyDevelopment: [
        'Facial expressions possible',
        'Liver making bile',
        'Spleen producing red blood cells',
        'Neck is lengthening',
      ],
      motherChanges: [
        'Appetite returning',
        'Skin may glow',
        'Hair may thicken',
        'Constipation possible',
      ],
      tips: [
        'Eat fiber-rich foods',
        'Drink plenty of water',
        'Continue exercising regularly',
        'Enjoy your renewed energy',
      ],
    },
    {
      week: 15,
      babySize: 'Apple',
      babyLength: '4 inches',
      babyWeight: '2.5 ounces',
      babyDevelopment: [
        'Light sensitivity developing',
        'Taste buds forming',
        'Legs are growing longer',
        'Can sense light through eyelids',
      ],
      motherChanges: [
        'Nose congestion common',
        'Growing belly visible',
        'Possible nosebleeds',
        'Increased blood volume',
      ],
      tips: [
        'Use a humidifier for congestion',
        'Stay hydrated',
        'Sleep on your side',
        'Consider maternity support belt',
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
      week: 17,
      babySize: 'Turnip',
      babyLength: '5.1 inches',
      babyWeight: '5.9 ounces',
      babyDevelopment: [
        'Skeleton changing from cartilage to bone',
        'Sweat glands developing',
        'Umbilical cord growing stronger',
        'Baby is practicing sucking and swallowing',
      ],
      motherChanges: [
        'Quickening may occur',
        'Round ligament pain',
        'Increased appetite',
        'Possible leg cramps',
      ],
      tips: [
        'Stretch regularly',
        'Wear supportive shoes',
        'Eat calcium-rich foods',
        'Stay hydrated',
      ],
    },
    {
      week: 18,
      babySize: 'Bell pepper',
      babyLength: '5.6 inches',
      babyWeight: '6.7 ounces',
      babyDevelopment: [
        'Ears are in final position',
        'Can hear your heartbeat',
        'Myelin forming around nerves',
        'Genitals visible on ultrasound',
      ],
      motherChanges: [
        'Baby movements more noticeable',
        'Growing belly',
        'Possible backache',
        'Increased vaginal discharge',
      ],
      tips: [
        'Talk or sing to your baby',
        'Practice good posture',
        'Consider prenatal yoga',
        'Schedule anatomy scan',
      ],
    },
    {
      week: 19,
      babySize: 'Mango',
      babyLength: '6 inches',
      babyWeight: '8.5 ounces',
      babyDevelopment: [
        'Vernix caseosa coating skin',
        'Sensory development progressing',
        'Hair growing on head',
        'Arms and legs in proportion',
      ],
      motherChanges: [
        'Definite baby kicks felt',
        'Skin stretching',
        'Possible dizziness',
        'Leg cramps at night',
      ],
      tips: [
        'Moisturize skin to prevent stretch marks',
        'Stand up slowly to avoid dizziness',
        'Massage legs before bed',
        'Drink plenty of fluids',
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
      week: 21,
      babySize: 'Carrot',
      babyLength: '10.5 inches',
      babyWeight: '12.7 ounces',
      babyDevelopment: [
        'Eyebrows and lids fully formed',
        'Bone marrow making blood cells',
        'Can taste amniotic fluid',
        'Movements becoming stronger',
      ],
      motherChanges: [
        'Increased appetite',
        'Varicose veins may appear',
        'Braxton Hicks may start',
        'Possible leg cramps',
      ],
      tips: [
        'Elevate legs when resting',
        'Eat small, frequent meals',
        'Stay physically active',
        'Wear compression stockings if needed',
      ],
    },
    {
      week: 22,
      babySize: 'Papaya',
      babyLength: '10.9 inches',
      babyWeight: '15.2 ounces',
      babyDevelopment: [
        'Lips, eyelids, and eyebrows distinct',
        'Eyes formed but irises lack pigment',
        'Pancreas developing',
        'Can perceive light and dark',
      ],
      motherChanges: [
        'Baby kicks stronger',
        'Linea nigra may appear',
        'Possible stretch marks',
        'Increased thirst',
      ],
      tips: [
        'Stay hydrated',
        'Use moisturizer on belly',
        'Enjoy feeling baby move',
        'Continue prenatal vitamins',
      ],
    },
    {
      week: 23,
      babySize: 'Grapefruit',
      babyLength: '11.4 inches',
      babyWeight: '1.1 pounds',
      babyDevelopment: [
        'Hearing fully developed',
        'Lungs practicing breathing',
        'Skin still wrinkled',
        'Fat beginning to deposit',
      ],
      motherChanges: [
        'Swelling in ankles and feet',
        'Possible heartburn',
        'Baby movements visible',
        'Skin may itch',
      ],
      tips: [
        'Avoid lying flat on back',
        'Eat smaller meals',
        'Moisturize itchy skin',
        'Put feet up regularly',
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
      week: 25,
      babySize: 'Cauliflower',
      babyLength: '13.6 inches',
      babyWeight: '1.5 pounds',
      babyDevelopment: [
        'Hair growing and developing color',
        'Hands fully developed',
        'Startle reflex developing',
        'Blood vessels in lungs forming',
      ],
      motherChanges: [
        'Hemorrhoids possible',
        'Increased appetite',
        'Trouble sleeping',
        'Baby hiccups felt',
      ],
      tips: [
        'Eat high-fiber foods',
        'Use pregnancy pillow',
        'Stay active with walking',
        'Avoid standing for long periods',
      ],
    },
    {
      week: 26,
      babySize: 'Scallion',
      babyLength: '14 inches',
      babyWeight: '1.7 pounds',
      babyDevelopment: [
        'Eyes beginning to open',
        'Can inhale and exhale',
        'Brain waves similar to newborn',
        'Spine getting stronger',
      ],
      motherChanges: [
        'Possible carpal tunnel syndrome',
        'Increased blood pressure possible',
        'More frequent urination',
        'Growing belly causing balance changes',
      ],
      tips: [
        'Monitor blood pressure',
        'Wear wrist splints if needed',
        'Practice good posture',
        'Schedule regular prenatal checkups',
      ],
    },
    {
      week: 27,
      babySize: 'Cauliflower',
      babyLength: '14.4 inches',
      babyWeight: '2 pounds',
      babyDevelopment: [
        'Can open and close eyes',
        'Sleep and wake cycles regular',
        'Lungs still immature but developing',
        'Brain very active',
      ],
      motherChanges: [
        'Third trimester approaching',
        'Possible restless leg syndrome',
        'Increased fatigue',
        'Possible lightning crotch pain',
      ],
      tips: [
        'Start childbirth education classes',
        'Practice relaxation techniques',
        'Get plenty of rest',
        'Stay hydrated',
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
      week: 29,
      babySize: 'Butternut squash',
      babyLength: '15.2 inches',
      babyWeight: '2.5 pounds',
      babyDevelopment: [
        'Muscles and lungs maturing',
        'Head growing to accommodate brain',
        'Eyebrows and lashes present',
        'Bones fully developed but soft',
      ],
      motherChanges: [
        'Increased pelvic pressure',
        'Possible varicose veins',
        'Increased vaginal discharge',
        'Fatigue increasing',
      ],
      tips: [
        'Rest with feet elevated',
        'Wear support hose',
        'Practice breathing exercises',
        'Plan hospital tour',
      ],
    },
    {
      week: 30,
      babySize: 'Cabbage',
      babyLength: '15.7 inches',
      babyWeight: '3 pounds',
      babyDevelopment: [
        'Lanugo beginning to disappear',
        'Bone marrow producing red blood cells',
        'Brain surface developing grooves',
        'Eyes can track light',
      ],
      motherChanges: [
        'Breasts may leak colostrum',
        'Increased clumsiness',
        'Possible numbness in hands',
        'Heartburn more frequent',
      ],
      tips: [
        'Wear nursing pads if leaking',
        'Move carefully to avoid falls',
        'Eat smaller, frequent meals',
        'Consider breastfeeding classes',
      ],
    },
    {
      week: 31,
      babySize: 'Coconut',
      babyLength: '16.2 inches',
      babyWeight: '3.3 pounds',
      babyDevelopment: [
        'Major development finished',
        'Gaining weight rapidly',
        'Moving to head-down position',
        'All five senses working',
      ],
      motherChanges: [
        'Braxton Hicks more frequent',
        'Possible shortness of breath',
        'Increased backache',
        'Trouble finding comfortable sleep position',
      ],
      tips: [
        'Use pillows for support while sleeping',
        'Practice labor positions',
        'Stay active with gentle exercise',
        'Prepare nursery',
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
      week: 33,
      babySize: 'Pineapple',
      babyLength: '17.2 inches',
      babyWeight: '4.2 pounds',
      babyDevelopment: [
        'Bones hardening',
        'Skull remains soft and flexible',
        'Immune system developing',
        'Brain and nervous system fully developed',
      ],
      motherChanges: [
        'Increased forgetfulness',
        'Pelvic pain intensifying',
        'More frequent bathroom trips',
        'Possible swelling in hands and feet',
      ],
      tips: [
        'Write things down to remember',
        'Wear comfortable shoes',
        'Stay off feet when possible',
        'Monitor swelling closely',
      ],
    },
    {
      week: 34,
      babySize: 'Cantaloupe',
      babyLength: '17.7 inches',
      babyWeight: '4.7 pounds',
      babyDevelopment: [
        'Fingernails reach fingertips',
        'Central nervous system maturing',
        'Fat layers developing',
        'Eyes can detect light outside womb',
      ],
      motherChanges: [
        'Vision changes possible',
        'Increased fatigue',
        'Pelvic pressure',
        'Possible carpal tunnel worsening',
      ],
      tips: [
        'Rest frequently',
        'Practice labor breathing',
        'Finalize birth plan',
        'Attend prenatal appointments regularly',
      ],
    },
    {
      week: 35,
      babySize: 'Honeydew melon',
      babyLength: '18.2 inches',
      babyWeight: '5.3 pounds',
      babyDevelopment: [
        'Kidneys fully developed',
        'Liver can process waste',
        'Most physical development complete',
        'Baby gaining about 1 ounce per day',
      ],
      motherChanges: [
        'Braxton Hicks increasing',
        'Possible heartburn worsening',
        'Hemorrhoids may develop',
        'Trouble breathing deeply',
      ],
      tips: [
        'Sleep propped up',
        'Eat small meals throughout day',
        'Prepare for baby arrival',
        'Know signs of preterm labor',
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
      week: 37,
      babySize: 'Swiss chard',
      babyLength: '19 inches',
      babyWeight: '6.3 pounds',
      babyDevelopment: [
        'Officially full term',
        'Practicing breathing and sucking',
        'Firm grasp developing',
        'Head may be engaged in pelvis',
      ],
      motherChanges: [
        'Increased pelvic pressure',
        'Mucus plug may discharge',
        'Cervix beginning to dilate',
        'Nesting instinct strong',
      ],
      tips: [
        'Watch for labor signs',
        'Pack hospital bag',
        'Rest when possible',
        'Have birth plan ready',
      ],
    },
    {
      week: 38,
      babySize: 'Leek',
      babyLength: '19.6 inches',
      babyWeight: '6.8 pounds',
      babyDevelopment: [
        'Lungs fully mature',
        'Vocal cords ready',
        'Digestive system ready for breast milk',
        'Meconium forming in intestines',
      ],
      motherChanges: [
        'Increased discharge',
        'Possible bloody show',
        'Swelling may worsen',
        'Very uncomfortable',
      ],
      tips: [
        'Monitor fetal movement',
        'Know when to call doctor',
        'Try to relax',
        'Avoid strenuous activity',
      ],
    },
    {
      week: 39,
      babySize: 'Mini watermelon',
      babyLength: '19.9 inches',
      babyWeight: '7.3 pounds',
      babyDevelopment: [
        'Brain continues to develop',
        'Skin smooth and pink',
        'Nails may extend beyond fingertips',
        'Fully prepared for birth',
      ],
      motherChanges: [
        'Possible water breaking',
        'Contractions may begin',
        'Extreme fatigue or energy burst',
        'Ready to meet baby',
      ],
      tips: [
        'Stay near hospital',
        'Time contractions if they start',
        'Eat light meals',
        'Stay calm and prepared',
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
      const dataWithTips = {
        ...info,
        dailyTips: info.dailyTips || getDailyTipsForWeek(info.week),
        pregnancyInfo: pregnancyInfoByWeek[info.week] || { appointments: [], tests: [], milestones: [] },
      };
      await setDoc(weekDoc, dataWithTips);
    }
    console.log('Week data initialized successfully!');
  } catch (error) {
    console.error('Error initializing week data:', error);
    throw error;
  }
};

// Fetch week image URL directly from Firebase Storage
// Expects images uploaded at: weekImages/week4.png, weekImages/week5.png, etc.
export const getWeekImageUrl = async (week: number): Promise<string | null> => {
  try {
    const imageRef = ref(storage, `weekImages/week${week}.png`);
    return await getDownloadURL(imageRef);
  } catch (error: any) {
    if (error?.code === 'storage/object-not-found' || error?.code === 'storage/unauthorized') {
      return null;
    }
    console.error(`Error fetching week ${week} image:`, error);
    return null;
  }
};
