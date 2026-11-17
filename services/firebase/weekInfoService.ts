import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { buildWeekDoc, weekDocId, WeekInfo } from '../../constants/pregnancyWeeks';

export type { DailyTip, PregnancyInfo, WeekInfo } from '../../constants/pregnancyWeeks';

// Fetch week information from Firestore
// Week content is static, so cache it for the session: paging weeks back and
// forth (home, week modal, growth gallery) is instant after the first load.
const weekCache = new Map<number, WeekInfo>();

export const peekWeekInfo = (week: number): WeekInfo | null => weekCache.get(week) ?? null;

/**
 * Firestore first (so content can be corrected without an app release), then the
 * copy bundled in constants/pregnancyWeeks.ts — used when the collection hasn't
 * been seeded yet or the device is offline.
 */
export const getWeekInfo = async (week: number): Promise<WeekInfo | null> => {
  const cached = weekCache.get(week);
  if (cached) return cached;
  let info: WeekInfo | null = null;
  try {
    const docSnap = await getDoc(doc(db, 'pregnancyWeeks', weekDocId(week)));
    if (docSnap.exists()) info = docSnap.data() as WeekInfo;
  } catch (error) {
    console.warn('Week info unavailable from Firestore, using bundled copy:', error);
  }
  info = info ?? buildWeekDoc(week);
  if (info) weekCache.set(week, info);
  return info;
};
