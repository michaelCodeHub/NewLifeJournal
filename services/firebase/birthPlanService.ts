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

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const buildBirthPlanHtml = (
  motherName: string,
  sections: BirthPlanSection[]
): string => {
  const generated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const sectionsHtml = sections
    .map(section => {
      const options =
        section.selectedOptions.length > 0
          ? `<ul>${section.selectedOptions
              .map(opt => `<li>${escapeHtml(opt)}</li>`)
              .join('')}</ul>`
          : `<p class="empty">(no preferences selected)</p>`;
      const notes = section.notes.trim()
        ? `<p class="notes"><strong>Notes:</strong> ${escapeHtml(section.notes.trim())}</p>`
        : '';
      return `<section><h2>${escapeHtml(section.title)}</h2>${options}${notes}</section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #333; padding: 32px; }
  h1 { color: #4a9498; font-size: 26px; margin-bottom: 2px; }
  .date { color: #888; font-size: 13px; margin-bottom: 24px; }
  section { margin-bottom: 20px; page-break-inside: avoid; }
  h2 { color: #81bec1; font-size: 18px; border-bottom: 2px solid #E0F2F3; padding-bottom: 4px; }
  ul { margin: 8px 0; padding-left: 22px; }
  li { margin-bottom: 4px; font-size: 14px; }
  .empty { color: #aaa; font-style: italic; font-size: 14px; }
  .notes { font-size: 14px; background: #f6fbfb; padding: 8px 10px; border-radius: 6px; }
</style>
</head>
<body>
  <h1>Birth Plan — ${escapeHtml(motherName)}</h1>
  <p class="date">Generated: ${generated}</p>
  ${sectionsHtml}
</body>
</html>`;
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
