import type { IconName } from '../components/ui/Icon';
import type { HospitalVisit, Symptom } from '../types';
import type { Tone } from '../components/ui/Surfaces';


/* ------------------------------------------------------------- trimester */

export const TOTAL_WEEKS = 40;

export const trimesterOf = (week: number): 1 | 2 | 3 => (week <= 13 ? 1 : week <= 26 ? 2 : 3);

export const trimesterLabel = (week: number) =>
  ['', '1st trimester', '2nd trimester', '3rd trimester'][trimesterOf(week)];

export const greeting = (date = new Date()) => {
  const h = date.getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

/* ---------------------------------------------------------------- visits */

export interface VisitTypeOption {
  label: string;
  db: HospitalVisit['type'];
  icon: IconName;
}

export const VISIT_TYPES: VisitTypeOption[] = [
  { label: 'Checkup', db: 'checkup', icon: 'medkit-outline' },
  { label: 'Ultrasound', db: 'ultrasound', icon: 'pulse-outline' },
  { label: 'Blood test', db: 'test', icon: 'water-outline' },
  { label: 'Glucose test', db: 'test', icon: 'flask-outline' },
  { label: 'Anatomy scan', db: 'ultrasound', icon: 'scan-outline' },
  { label: 'First trimester screening', db: 'test', icon: 'clipboard-outline' },
  { label: 'Non-stress test', db: 'test', icon: 'heart-outline' },
  { label: 'Emergency visit', db: 'emergency', icon: 'alert-circle-outline' },
  { label: 'Other', db: 'checkup', icon: 'ellipsis-horizontal-circle-outline' },
];

const VISIT_DB_LABEL: Record<HospitalVisit['type'], string> = {
  checkup: 'Checkup',
  ultrasound: 'Ultrasound',
  test: 'Test',
  emergency: 'Emergency visit',
};

const VISIT_DB_ICON: Record<HospitalVisit['type'], IconName> = {
  checkup: 'medkit-outline',
  ultrasound: 'pulse-outline',
  test: 'flask-outline',
  emergency: 'alert-circle-outline',
};

/** Prefer the user's specific label (stored in `label`), fall back to the category. */
export const visitTitle = (v: Pick<HospitalVisit, 'type'> & { label?: string }) => v.label || VISIT_DB_LABEL[v.type] || 'Visit';
export const visitIcon = (v: Pick<HospitalVisit, 'type'>) => VISIT_DB_ICON[v.type] ?? 'medkit-outline';

/* -------------------------------------------------------------- symptoms */

export interface SymptomTypeOption {
  label: string;
  db: Symptom['type'];
  icon: IconName;
}

export const SYMPTOM_TYPES: SymptomTypeOption[] = [
  { label: 'Nausea', db: 'nausea', icon: 'sad-outline' },
  { label: 'Fatigue', db: 'fatigue', icon: 'moon-outline' },
  { label: 'Headache', db: 'headache', icon: 'flash-outline' },
  { label: 'Back pain', db: 'back_pain', icon: 'body-outline' },
  { label: 'Leg cramps', db: 'other', icon: 'walk-outline' },
  { label: 'Heartburn', db: 'other', icon: 'flame-outline' },
  { label: 'Constipation', db: 'other', icon: 'hourglass-outline' },
  { label: 'Mood swings', db: 'other', icon: 'cloudy-outline' },
  { label: 'Swelling', db: 'other', icon: 'water-outline' },
  { label: 'Shortness of breath', db: 'other', icon: 'cloud-outline' },
  { label: 'Other', db: 'other', icon: 'add-circle-outline' },
];

const SYMPTOM_DB_LABEL: Record<Symptom['type'], string> = {
  nausea: 'Nausea',
  fatigue: 'Fatigue',
  headache: 'Headache',
  back_pain: 'Back pain',
  other: 'Other',
};

export const symptomTitle = (s: Pick<Symptom, 'type' | 'label'>) => s.label || SYMPTOM_DB_LABEL[s.type] || 'Symptom';

const SYMPTOM_DB_ICON: Record<Symptom['type'], IconName> = {
  nausea: 'sad-outline',
  fatigue: 'moon-outline',
  headache: 'flash-outline',
  back_pain: 'body-outline',
  other: 'thermometer-outline',
};

/**
 * Each known symptom gets its own icon so a list can be scanned at a glance.
 * Matches the user's label first (e.g. "Heartburn"), then the stored category;
 * anything custom falls back to the general symptoms icon.
 */
export const symptomIcon = (s?: Pick<Symptom, 'type' | 'label'>): IconName => {
  if (!s) return 'thermometer-outline';
  const label = s.label?.trim().toLowerCase();
  const known = label ? SYMPTOM_TYPES.find((t) => t.label.toLowerCase() === label && t.label !== 'Other') : undefined;
  return known?.icon ?? SYMPTOM_DB_ICON[s.type] ?? 'thermometer-outline';
};

/** Category for a free-text or picked label (only 5 DB categories exist). */
export const symptomDbType = (label: string): Symptom['type'] => {
  const known = SYMPTOM_TYPES.find((t) => t.label.toLowerCase() === label.trim().toLowerCase());
  if (known) return known.db;
  const l = label.toLowerCase();
  if (l.includes('nausea') || l.includes('vomit')) return 'nausea';
  if (l.includes('fatigue') || l.includes('tired')) return 'fatigue';
  if (l.includes('headache') || l.includes('migraine')) return 'headache';
  if (l.includes('back')) return 'back_pain';
  return 'other';
};

/* -------------------------------------------------------------- severity */

export const SEVERITY: Record<1 | 2 | 3 | 4 | 5, { label: string; tone: Tone }> = {
  1: { label: 'Mild', tone: 'green' },
  2: { label: 'Moderate', tone: 'green' },
  3: { label: 'Noticeable', tone: 'gold' },
  4: { label: 'Severe', tone: 'orange' },
  5: { label: 'Very severe', tone: 'red' },
};

/* ----------------------------------------------------------------- dates */

export const shortDate = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
export const longDate = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

/* ---------------------------------------------------------------- per day */

/**
 * Totals per calendar day for the last `days` days (oldest first, today last),
 * labelled with the short weekday — for the kick counter's 7-day chart.
 */
export const perDay = (
  items: { date: Date; value: number }[],
  days = 7,
  now = new Date()
): { label: string; value: number; date: Date }[] => {
  const out = Array.from({ length: days }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i));
    return { date, label: date.toLocaleDateString(undefined, { weekday: 'narrow' }), value: 0 };
  });
  const first = out[0].date.getTime();
  for (const it of items) {
    const d = new Date(it.date.getFullYear(), it.date.getMonth(), it.date.getDate()).getTime();
    if (d < first) continue;
    const idx = Math.round((d - first) / 86400000);
    if (idx >= 0 && idx < days) out[idx].value += it.value;
  }
  return out;
};
