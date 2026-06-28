import { doc, setDoc, getDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

export interface BirthPlanSection {
  title: string;
  selectedOptions: string[];
  notes: string;
}

export interface BirthPlan {
  id: string;
  pregnancyId: string;
  sections: BirthPlanSection[];
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

export const BIRTH_PLAN_SECTIONS = [
  {
    title: 'Pain Management',
    options: [
      'No pain medication (natural birth)',
      'Epidural',
      'IV pain medication',
      'Nitrous oxide (laughing gas)',
      'Water therapy / birthing pool',
      'Massage and breathing techniques',
    ],
  },
  {
    title: 'Labor Preferences',
    options: [
      'Freedom to move and walk',
      'Dim lighting preferred',
      'Quiet environment',
      'Music playing',
      'Minimal interruptions',
      'Continuous fetal monitoring',
      'Intermittent monitoring if possible',
    ],
  },
  {
    title: 'Delivery Preferences',
    options: [
      'Avoid episiotomy if possible',
      'Allow perineal tearing to heal naturally',
      'Partner to cut umbilical cord',
      'Delayed cord clamping',
      'Immediate skin-to-skin contact',
      'Mirror to see the birth',
      'Photography / video allowed',
    ],
  },
  {
    title: 'After Delivery',
    options: [
      'Breastfeeding immediately',
      'Formula feeding',
      'Skin-to-skin time before any procedures',
      'Newborn procedures done in room',
      'Rooming in (baby stays with me)',
      'Baby to nursery for observation',
    ],
  },
  {
    title: 'Special Requests',
    options: [
      'Religious / cultural preferences honored',
      'Specific support person(s) present',
      'No students or trainees present',
      'Interpreter needed',
      'Placenta to be saved',
    ],
  },
] as const;

const getPlanRef = (userId: string, pregnancyId: string) =>
  doc(db, 'users', userId, 'pregnancies', pregnancyId, 'birthPlan', 'main');

export const DEFAULT_SECTIONS: BirthPlanSection[] = BIRTH_PLAN_SECTIONS.map(s => ({
  title: s.title,
  selectedOptions: [],
  notes: '',
}));

export const saveBirthPlan = async (
  userId: string,
  pregnancyId: string,
  sections: BirthPlanSection[]
): Promise<void> => {
  const ref = getPlanRef(userId, pregnancyId);
  const existing = await getDoc(ref);
  await setDoc(ref, {
    pregnancyId,
    sections,
    updatedAt: Timestamp.now(),
    createdAt: existing.exists() ? existing.data().createdAt : Timestamp.now(),
  });
};

export const subscribeToBirthPlan = (
  userId: string,
  pregnancyId: string,
  callback: (plan: BirthPlan | null) => void
): (() => void) => {
  return onSnapshot(getPlanRef(userId, pregnancyId), (snap) => {
    if (!snap.exists()) {
      callback(null);
    } else {
      callback({ id: snap.id, ...snap.data() } as BirthPlan);
    }
  });
};

export const exportBirthPlanText = (
  motherName: string,
  sections: BirthPlanSection[]
): string => {
  const lines: string[] = [
    `BIRTH PLAN — ${motherName.toUpperCase()}`,
    `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    '',
  ];
  sections.forEach(section => {
    lines.push(`## ${section.title}`);
    if (section.selectedOptions.length > 0) {
      section.selectedOptions.forEach(opt => lines.push(`  • ${opt}`));
    } else {
      lines.push('  (no preferences selected)');
    }
    if (section.notes.trim()) {
      lines.push(`  Notes: ${section.notes.trim()}`);
    }
    lines.push('');
  });
  return lines.join('\n');
};
