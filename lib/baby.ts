import type { IconName } from '../components/ui/Icon';
import type { Tone } from '../components/ui/Surfaces';
import type {
  BabyActivity,
  BreastSide,
  DiaperColor,
  DiaperKind,
  FeedType,
  HealthEvent,
  HealthEventType,
} from '../types';

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
export const ML_PER_OZ = 29.5735;

/* ------------------------------------------------------------------- age */

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Day 1 is the birth date. */
export const dayOfLife = (birth: Date, now = new Date()) =>
  Math.max(1, Math.round((startOfDay(now).getTime() - startOfDay(birth).getTime()) / DAY) + 1);

/** "3 days old", "5 weeks old", "4 months old", "1 year 2 months old". */
export const ageLabel = (birth: Date, now = new Date()): string => {
  const days = dayOfLife(birth, now) - 1;
  if (days < 1) return 'Born today';
  if (days < 14) return `${days} ${days === 1 ? 'day' : 'days'} old`;
  if (days < 7 * 13) {
    const w = Math.floor(days / 7);
    return `${w} weeks old`;
  }
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 24) return `${months} months old`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y} ${y === 1 ? 'year' : 'years'}${m ? ` ${m} ${m === 1 ? 'month' : 'months'}` : ''} old`;
};

/* -------------------------------------------------------------- durations */

/** Whole minutes between two dates (at least 0). */
export const minutesBetween = (a: Date, b: Date) => Math.max(0, Math.round((b.getTime() - a.getTime()) / MIN));

/** "45 min", "1h 20m", "8h". */
export const formatMinutes = (mins: number): string => {
  const m = Math.max(0, Math.round(mins));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
};

/** "just now", "12 min ago", "2h 5m ago". */
export const formatAgo = (from: Date, now = new Date()): string => {
  const m = minutesBetween(from, now);
  return m < 1 ? 'just now' : `${formatMinutes(m)} ago`;
};

export const isRunning = (a: Pick<BabyActivity, 'type' | 'endedAt'>) => a.type !== 'diaper' && !a.endedAt;

/** Duration of a timed activity; running ones count up to `now`. */
export const activityMinutes = (a: BabyActivity, now = new Date()): number =>
  a.type === 'diaper' ? 0 : minutesBetween(a.startedAt.toDate(), a.endedAt ? a.endedAt.toDate() : now);

/* ------------------------------------------------------------------ units */

export const ozToMl = (oz: number) => Math.round(oz * ML_PER_OZ);
export const mlToOz = (ml: number) => Math.round((ml / ML_PER_OZ) * 10) / 10;

/** Parse a user-typed number ("120", "4,5") — undefined when empty or invalid. */
export const parseAmount = (s: string): number | undefined => {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/* ----------------------------------------------------------------- labels */

export const FEED_TYPES: { value: FeedType; label: string }[] = [
  { value: 'breast', label: 'Breast' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'solid', label: 'Solids' },
];
export const BREAST_SIDES: { value: BreastSide; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'both', label: 'Both' },
];
export const DIAPER_KINDS: { value: DiaperKind; label: string }[] = [
  { value: 'wet', label: 'Wet' },
  { value: 'dirty', label: 'Dirty' },
  { value: 'both', label: 'Both' },
];
export const DIAPER_COLORS: { value: DiaperColor; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'green', label: 'Green' },
  { value: 'other', label: 'Other' },
];
export const HEALTH_TYPES: { value: HealthEventType; label: string; icon: IconName }[] = [
  { value: 'vaccine', label: 'Vaccine', icon: 'medical-outline' },
  { value: 'checkup', label: 'Checkup', icon: 'medkit-outline' },
  { value: 'illness', label: 'Illness', icon: 'thermometer-outline' },
  { value: 'medicine', label: 'Medicine', icon: 'bandage-outline' },
];

/** Semantic look per kind of entry (README: one icon per feature). */
export const BABY_LOOK = {
  feeding: { icon: 'nutrition-outline' as IconName, tone: 'teal' as Tone },
  diaper: { icon: 'water-outline' as IconName, tone: 'blue' as Tone },
  sleep: { icon: 'moon-outline' as IconName, tone: 'plum' as Tone },
  growth: { icon: 'scale-outline' as IconName, tone: 'green' as Tone },
  health: { icon: 'medical-outline' as IconName, tone: 'red' as Tone },
};

const labelOf = <T extends string>(list: { value: T; label: string }[], v?: T) => list.find((x) => x.value === v)?.label;

/** "Breast feed", "Bottle feed", "Solids", "Wet diaper", "Sleep". */
export const activityTitle = (a: BabyActivity): string => {
  if (a.type === 'feeding') return a.feeding?.feedType === 'solid' ? 'Solids' : `${labelOf(FEED_TYPES, a.feeding?.feedType) ?? ''} feed`.trim();
  if (a.type === 'diaper') {
    const k = a.diaper?.kind;
    return k === 'both' ? 'Wet + dirty diaper' : `${labelOf(DIAPER_KINDS, k) ?? ''} diaper`.trim();
  }
  return 'Sleep';
};

/** The key stat for a row: "Left · 14 min", "120 ml", "Green", "2h 14m" (or "In progress"). */
export const activityDetail = (a: BabyActivity, now = new Date()): string => {
  const running = isRunning(a);
  const dur = running ? 'In progress' : formatMinutes(activityMinutes(a, now));
  if (a.type === 'feeding') {
    const f = a.feeding;
    const parts: string[] = [];
    if (f?.feedType === 'breast' && f.side) parts.push(labelOf(BREAST_SIDES, f.side)!);
    if (f?.amountMl) parts.push(`${f.amountMl} ml`);
    if (running || f?.feedType === 'breast' || activityMinutes(a, now) > 0) parts.push(dur);
    return parts.join(' · ');
  }
  if (a.type === 'diaper') return a.diaper?.color && a.diaper.color !== 'normal' ? labelOf(DIAPER_COLORS, a.diaper.color)! : '';
  return dur;
};

export const healthTitle = (h: Pick<HealthEvent, 'type' | 'title'>) => h.title || labelOf(HEALTH_TYPES, h.type) || 'Health';
export const healthIcon = (type: HealthEventType): IconName => HEALTH_TYPES.find((t) => t.value === type)?.icon ?? 'medical-outline';

/* ------------------------------------------------------------------- days */

/** Local calendar day key, e.g. "2026-11-17". */
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "Today", "Yesterday", or "Mon, Nov 10". */
export const dayLabel = (d: Date, now = new Date()): string => {
  const diff = Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / DAY);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

export interface DaySummary {
  feeds: number;
  diapers: number;
  wet: number;
  dirty: number;
  /** Sleep minutes falling inside this day (a night's sleep is split at midnight). */
  sleepMinutes: number;
}

/** Totals for the calendar day containing `day`. */
export const summarizeDay = (activities: BabyActivity[], day: Date, now = new Date()): DaySummary => {
  const start = startOfDay(day).getTime();
  const end = start + DAY;
  const out: DaySummary = { feeds: 0, diapers: 0, wet: 0, dirty: 0, sleepMinutes: 0 };
  for (const a of activities) {
    const t = a.startedAt.toMillis();
    if (a.type === 'sleep') {
      const s = Math.max(t, start);
      const e = Math.min(a.endedAt ? a.endedAt.toMillis() : now.getTime(), end);
      if (e > s) out.sleepMinutes += Math.round((e - s) / MIN);
      continue;
    }
    if (t < start || t >= end) continue;
    if (a.type === 'feeding') out.feeds += 1;
    else {
      out.diapers += 1;
      if (a.diaper?.kind !== 'dirty') out.wet += 1;
      if (a.diaper?.kind !== 'wet') out.dirty += 1;
    }
  }
  return out;
};

/** "6 feeds · 4 diapers · 8h 20m sleep" (parts with nothing are left out). */
export const formatDaySummary = (s: DaySummary): string =>
  [
    s.feeds ? `${s.feeds} ${s.feeds === 1 ? 'feed' : 'feeds'}` : null,
    s.diapers ? `${s.diapers} ${s.diapers === 1 ? 'diaper' : 'diapers'}` : null,
    s.sleepMinutes ? `${formatMinutes(s.sleepMinutes)} sleep` : null,
  ]
    .filter(Boolean)
    .join(' · ') || 'Nothing logged';

/** The most recent finished-or-running activity of a type (lists are newest first). */
export const lastOfType = (activities: BabyActivity[], type: BabyActivity['type']) => activities.find((a) => a.type === type);

/* ------------------------------------------------------------ date + time */

/** Keeps the time of `time` on the calendar day of `day`. */
export const withDay = (time: Date, day: Date) =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.getHours(), time.getMinutes());

export const timeOfDay = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
