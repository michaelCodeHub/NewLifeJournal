import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Baby, BabyActivity, GrowthRecord, HealthEvent } from '../../types';
import { trackEvent } from '../monitoring/analytics';
import { logError } from '../monitoring/errorLogger';

/** Sub-collections under users/{uid}/babies/{babyId}. */
export type BabyCollection = 'activities' | 'growth' | 'health' | 'chatMessages';

/**
 * How many recent activities the app keeps live. A busy newborn day is ~25
 * entries, so this is roughly the last two to three weeks; older history stays
 * in Firestore (and in the AI's summary) but isn't loaded.
 */
export const ACTIVITY_WINDOW = 600;

const babiesRef = (uid: string) => collection(db, 'users', uid, 'babies');
const babyDoc = (uid: string, babyId: string) => doc(db, 'users', uid, 'babies', babyId);
const subRef = (uid: string, babyId: string, name: BabyCollection) => collection(db, 'users', uid, 'babies', babyId, name);

/** Firestore rejects `undefined`; drop it on create. */
function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

/** On update, `undefined` means "clear this field". */
function forUpdate(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === undefined ? deleteField() : v]));
}

const withId = <T,>(d: { id: string; data(): unknown }) => ({ ...(d.data() as object), id: d.id }) as T;

/* ----------------------------------------------------------------- babies */

export type NewBaby = Omit<Baby, 'id' | 'status' | 'createdAt' | 'updatedAt'>;

/** Creates the baby with a client-generated id (one write, so it works offline). */
export const createBaby = async (uid: string, data: NewBaby): Promise<string> => {
  try {
    const ref = doc(babiesRef(uid));
    const now = Timestamp.now();
    await setDoc(ref, compact({ ...data, id: ref.id, status: 'active', createdAt: now, updatedAt: now }));
    trackEvent('baby_created');
    return ref.id;
  } catch (error) {
    logError(error, { screen: 'babyService', action: 'createBaby' });
    throw error;
  }
};

export const updateBaby = async (uid: string, babyId: string, updates: Partial<NewBaby>): Promise<void> => {
  try {
    await updateDoc(babyDoc(uid, babyId), { ...forUpdate(updates), updatedAt: Timestamp.now() });
  } catch (error) {
    logError(error, { screen: 'babyService', action: 'updateBaby' });
    throw error;
  }
};

/** Deletes a baby and everything logged for it (client-side; owner-only rules allow it). */
export const deleteBaby = async (uid: string, babyId: string): Promise<void> => {
  try {
    for (const name of ['activities', 'growth', 'health', 'chatMessages'] as BabyCollection[]) {
      const snap = await getDocs(subRef(uid, babyId, name));
      for (let i = 0; i < snap.docs.length; i += 450) {
        const batch = writeBatch(db);
        snap.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }
    await deleteDoc(babyDoc(uid, babyId));
    trackEvent('baby_deleted');
  } catch (error) {
    logError(error, { screen: 'babyService', action: 'deleteBaby' });
    throw error;
  }
};

export const subscribeToBabies = (
  uid: string,
  callback: (babies: Baby[]) => void,
  onError?: (error: Error) => void
): (() => void) =>
  onSnapshot(
    babiesRef(uid),
    (snap) => callback(snap.docs.map((d) => withId<Baby>(d))),
    (error) => {
      logError(error, { screen: 'baby', action: 'subscribeToBabies' });
      onError?.(error);
    }
  );

/* ------------------------------------------------------------- activities */

export type ActivityInput = Omit<BabyActivity, 'id' | 'createdAt'>;

export const addActivity = async (uid: string, babyId: string, data: ActivityInput): Promise<string> => {
  try {
    const ref = doc(subRef(uid, babyId, 'activities'));
    await setDoc(ref, compact({ ...data, id: ref.id, createdAt: Timestamp.now() }) as Record<string, unknown>);
    trackEvent(data.type === 'feeding' ? 'feed_logged' : data.type === 'diaper' ? 'diaper_logged' : 'sleep_logged');
    return ref.id;
  } catch (error) {
    logError(error, { screen: 'babyService', action: 'addActivity' });
    throw error;
  }
};

export const updateActivity = async (
  uid: string,
  babyId: string,
  activityId: string,
  updates: Partial<ActivityInput>
): Promise<void> => {
  try {
    await updateDoc(doc(subRef(uid, babyId, 'activities'), activityId), forUpdate(updates));
  } catch (error) {
    logError(error, { screen: 'babyService', action: 'updateActivity' });
    throw error;
  }
};

/** Stops a running feed or sleep timer. */
export const endActivity = (uid: string, babyId: string, activityId: string, at: Date = new Date()) =>
  updateActivity(uid, babyId, activityId, { endedAt: Timestamp.fromDate(at) });

export const subscribeToActivities = (
  uid: string,
  babyId: string,
  callback: (activities: BabyActivity[]) => void,
  onError?: (error: Error) => void
): (() => void) =>
  onSnapshot(
    query(subRef(uid, babyId, 'activities'), orderBy('startedAt', 'desc'), limit(ACTIVITY_WINDOW)),
    (snap) => callback(snap.docs.map((d) => withId<BabyActivity>(d))),
    (error) => {
      logError(error, { screen: 'baby', action: 'subscribeToActivities' });
      onError?.(error);
    }
  );

/* ------------------------------------------------------- growth & health */

export type GrowthInput = Omit<GrowthRecord, 'id' | 'createdAt'>;
export type HealthInput = Omit<HealthEvent, 'id' | 'createdAt'>;

const addTo =
  <T extends Record<string, unknown>>(name: 'growth' | 'health', event: string) =>
  async (uid: string, babyId: string, data: T): Promise<string> => {
    try {
      const ref = doc(subRef(uid, babyId, name));
      await setDoc(ref, compact({ ...data, id: ref.id, createdAt: Timestamp.now() }));
      trackEvent(event);
      return ref.id;
    } catch (error) {
      logError(error, { screen: 'babyService', action: `add_${name}` });
      throw error;
    }
  };

export const addGrowthRecord = addTo<GrowthInput & Record<string, unknown>>('growth', 'growth_logged');
export const addHealthEvent = addTo<HealthInput & Record<string, unknown>>('health', 'health_event_logged');

export const updateBabyEntry = async (
  uid: string,
  babyId: string,
  name: 'growth' | 'health',
  id: string,
  updates: Record<string, unknown>
): Promise<void> => {
  try {
    await updateDoc(doc(subRef(uid, babyId, name), id), forUpdate(updates));
  } catch (error) {
    logError(error, { screen: 'babyService', action: `update_${name}` });
    throw error;
  }
};

export const deleteBabyEntry = async (
  uid: string,
  babyId: string,
  name: 'activities' | 'growth' | 'health',
  id: string
): Promise<void> => {
  try {
    await deleteDoc(doc(subRef(uid, babyId, name), id));
  } catch (error) {
    logError(error, { screen: 'babyService', action: `delete_${name}` });
    throw error;
  }
};

const subscribeByDate =
  <T,>(name: 'growth' | 'health') =>
  (uid: string, babyId: string, callback: (rows: T[]) => void, onError?: (error: Error) => void): (() => void) =>
    onSnapshot(
      query(subRef(uid, babyId, name), orderBy('date', 'desc')),
      (snap) => callback(snap.docs.map((d) => withId<T>(d))),
      (error) => {
        logError(error, { screen: 'baby', action: `subscribe_${name}` });
        onError?.(error);
      }
    );

export const subscribeToGrowth = subscribeByDate<GrowthRecord>('growth');
export const subscribeToHealth = subscribeByDate<HealthEvent>('health');
