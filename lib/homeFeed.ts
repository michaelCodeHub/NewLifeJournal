import type { HospitalVisit, Milestone, Symptom } from '../types';
import type { IconName } from '../components/ui/Icon';
import { shortDate, symptomIcon, symptomTitle, visitIcon, visitTitle } from './journal';

/** Pure helpers behind the Home sections (Coming up · Recently logged · tip of the day). */

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Whole calendar days from `now` to `d` (0 = today, 1 = tomorrow, -1 = yesterday). */
export const daysBetween = (now: Date, d: Date) => Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / DAY);

/** "Today" · "Tomorrow" · "Yesterday" · "In 6 days" · "3 days ago" · "Nov 2" (beyond a week). */
export function relativeDay(d: Date, now = new Date()): string {
  const n = daysBetween(now, d);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n > 1 && n <= 7) return `In ${n} days`;
  if (n < -1 && n >= -7) return `${-n} days ago`;
  return shortDate(d);
}

export interface UpcomingVisit {
  date: Date;
  /** The visit it came from: a dated future visit, or the visit that set this "next appointment". */
  title: string;
  icon: IconName;
}

/**
 * The next appointment from today on: a visit dated in the future, or the "next
 * appointment" saved on a past visit — whichever comes first.
 */
export function nextAppointment(visits: HospitalVisit[], now = new Date()): UpcomingVisit | null {
  const today = startOfDay(now).getTime();
  let best: UpcomingVisit | null = null;
  const consider = (date: Date, title: string, icon: IconName) => {
    if (startOfDay(date).getTime() < today) return;
    if (!best || date < best.date) best = { date, title, icon };
  };
  for (const v of visits) {
    const date = v.date.toDate();
    if (date.getTime() > now.getTime()) consider(date, visitTitle(v), visitIcon(v));
    if (v.nextVisitDate) consider(v.nextVisitDate.toDate(), 'Next appointment', 'calendar-outline');
  }
  return best;
}

export interface RecentEntry {
  key: string;
  kind: 'visit' | 'symptom' | 'milestone';
  title: string;
  icon: IconName;
  date: Date;
}

/** The latest `count` journal entries (not in the future), newest first. */
export function recentEntries(
  { visits, symptoms, milestones }: { visits: HospitalVisit[]; symptoms: Symptom[]; milestones: Milestone[] },
  count = 3,
  now = new Date()
): RecentEntry[] {
  const all: RecentEntry[] = [
    ...visits.map((v) => ({ key: `v-${v.id}`, kind: 'visit' as const, title: visitTitle(v), icon: visitIcon(v), date: v.date.toDate() })),
    ...symptoms.map((s) => ({ key: `s-${s.id}`, kind: 'symptom' as const, title: symptomTitle(s), icon: symptomIcon(s), date: s.date.toDate() })),
    ...milestones.map((m) => ({ key: `m-${m.id}`, kind: 'milestone' as const, title: m.title, icon: 'star-outline' as IconName, date: m.date.toDate() })),
  ];
  return all
    .filter((e) => e.date.getTime() <= now.getTime())
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, count);
}

/** One of the week's tips, changing once a day (stable for the whole day). */
export function tipOfTheDay(tips: string[], now = new Date()): string | null {
  if (!tips.length) return null;
  const dayNumber = Math.floor(startOfDay(now).getTime() / DAY);
  return tips[((dayNumber % tips.length) + tips.length) % tips.length];
}
