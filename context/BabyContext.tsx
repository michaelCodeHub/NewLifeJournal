import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Timestamp } from 'firebase/firestore';
import { recordLogForReview } from '../services/reviewPrompt';
import { useAuth } from './AuthContext';
import type { Baby, BabyActivity, GrowthRecord, HealthEvent } from '../types';
import {
  ActivityInput,
  addActivity as addActivityService,
  addGrowthRecord,
  addHealthEvent,
  createBaby as createBabyService,
  deleteBaby as deleteBabyService,
  deleteBabyEntry,
  endActivity as endActivityService,
  GrowthInput,
  HealthInput,
  NewBaby,
  subscribeToActivities,
  subscribeToBabies,
  subscribeToGrowth,
  subscribeToHealth,
  updateActivity as updateActivityService,
  updateBaby as updateBabyService,
  updateBabyEntry,
} from '../services/firebase/babyService';
import { completePregnancy } from '../services/firebase/pregnancyService';
import { isRunning } from '../lib/baby';
import { trackEvent } from '../services/monitoring/analytics';

export interface BabyFormData {
  name: string;
  birthDate: Date;
  birthWeight?: number;
  birthHeight?: number;
  gender?: Baby['gender'];
}

interface BabyContextType {
  /** All of this user's babies (active first, newest first). */
  babies: Baby[];
  /** The baby the app is showing. */
  baby: Baby | null;
  /** Newest first. The last ~600 entries; see ACTIVITY_WINDOW. */
  activities: BabyActivity[];
  growth: GrowthRecord[];
  health: HealthEvent[];
  loading: boolean;
  error: string | null;
  runningFeed: BabyActivity | null;
  runningSleep: BabyActivity | null;
  selectBaby: (babyId: string) => void;
  /** Adds a baby (onboarding / "add another baby") and makes it the shown one. */
  createBaby: (data: BabyFormData) => Promise<string>;
  /**
   * "Baby has arrived": creates the baby linked to the pregnancy, closes the
   * pregnancy (status completed, birth date, transitionedToBabyId) and switches
   * the app to baby mode.
   */
  welcomeBaby: (pregnancyId: string, data: BabyFormData) => Promise<string>;
  updateBaby: (data: BabyFormData) => Promise<void>;
  deleteBaby: (babyId: string) => Promise<void>;
  addActivity: (data: ActivityInput) => Promise<string>;
  updateActivity: (id: string, data: Partial<ActivityInput>) => Promise<void>;
  endActivity: (id: string, at?: Date) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  addGrowth: (data: GrowthInput) => Promise<void>;
  updateGrowth: (id: string, data: GrowthInput) => Promise<void>;
  deleteGrowth: (id: string) => Promise<void>;
  addHealth: (data: HealthInput) => Promise<void>;
  updateHealth: (id: string, data: HealthInput) => Promise<void>;
  deleteHealth: (id: string) => Promise<void>;
}

const BabyContext = createContext<BabyContextType | undefined>(undefined);

const selectionKey = (uid: string) => `baby:selected:${uid}`;

const toNewBaby = (d: BabyFormData): NewBaby => ({
  name: d.name.trim(),
  birthDate: Timestamp.fromDate(d.birthDate),
  birthWeight: d.birthWeight,
  birthHeight: d.birthHeight,
  gender: d.gender,
});

/** Active babies first, then newest birth first. */
export function sortBabies(all: Baby[]): Baby[] {
  return [...all].sort(
    (a, b) =>
      (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) ||
      (b.birthDate?.toMillis?.() ?? 0) - (a.birthDate?.toMillis?.() ?? 0)
  );
}

export const BabyProvider = ({ children }: { children: ReactNode }) => {
  const { user, setCurrentMode } = useAuth();
  const uid = user?.uid ?? null;

  const [babies, setBabies] = useState<Baby[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activities, setActivities] = useState<BabyActivity[]>([]);
  const [growth, setGrowth] = useState<GrowthRecord[]>([]);
  const [health, setHealth] = useState<HealthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Babies + the remembered selection.
  useEffect(() => {
    if (!uid) {
      setBabies([]);
      setSelectedId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    AsyncStorage.getItem(selectionKey(uid))
      .then((id) => id && setSelectedId((cur) => cur ?? id))
      .catch(() => undefined);
    return subscribeToBabies(
      uid,
      (all) => {
        setBabies(sortBabies(all));
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Could not load your baby.');
        setLoading(false);
      }
    );
  }, [uid]);

  const baby = useMemo(() => babies.find((b) => b.id === selectedId) ?? babies[0] ?? null, [babies, selectedId]);
  const babyId = baby?.id ?? null;

  useEffect(() => {
    if (!uid || !babyId) {
      setActivities([]);
      return;
    }
    return subscribeToActivities(uid, babyId, setActivities, (err) => setError(err.message));
  }, [uid, babyId]);

  useEffect(() => {
    if (!uid || !babyId) {
      setGrowth([]);
      return;
    }
    return subscribeToGrowth(uid, babyId, setGrowth);
  }, [uid, babyId]);

  useEffect(() => {
    if (!uid || !babyId) {
      setHealth([]);
      return;
    }
    return subscribeToHealth(uid, babyId, setHealth);
  }, [uid, babyId]);

  const runningFeed = useMemo(() => activities.find((a) => a.type === 'feeding' && isRunning(a)) ?? null, [activities]);
  const runningSleep = useMemo(() => activities.find((a) => a.type === 'sleep' && isRunning(a)) ?? null, [activities]);

  const selectBaby = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (uid) AsyncStorage.setItem(selectionKey(uid), id).catch(() => undefined);
    },
    [uid]
  );

  const need = useCallback(() => {
    if (!uid || !babyId) throw new Error('No baby profile yet');
    return { uid, babyId };
  }, [uid, babyId]);

  const createBaby = useCallback(
    async (data: BabyFormData) => {
      if (!uid) throw new Error('Not signed in');
      const id = await createBabyService(uid, toNewBaby(data));
      selectBaby(id);
      await setCurrentMode('baby');
      return id;
    },
    [uid, selectBaby, setCurrentMode]
  );

  const welcomeBaby = useCallback(
    async (pregnancyId: string, data: BabyFormData) => {
      if (!uid) throw new Error('Not signed in');
      const id = await createBabyService(uid, { ...toNewBaby(data), fromPregnancyId: pregnancyId });
      await completePregnancy(uid, pregnancyId, data.birthDate, id);
      selectBaby(id);
      await setCurrentMode('baby');
      trackEvent('transition_completed');
      return id;
    },
    [uid, selectBaby, setCurrentMode]
  );

  const updateBaby = useCallback(
    async (data: BabyFormData) => {
      const { uid: u, babyId: b } = need();
      await updateBabyService(u, b, toNewBaby(data));
    },
    [need]
  );

  const deleteBaby = useCallback(
    async (id: string) => {
      if (!uid) throw new Error('Not signed in');
      await deleteBabyService(uid, id);
      if (selectedId === id) setSelectedId(null);
    },
    [uid, selectedId]
  );

  const addActivity = useCallback(
    async (data: ActivityInput) => {
      const { uid: u, babyId: b } = need();
      const id = await addActivityService(u, b, data);
      recordLogForReview();
      return id;
    },
    [need]
  );
  const updateActivity = useCallback(
    async (id: string, data: Partial<ActivityInput>) => {
      const { uid: u, babyId: b } = need();
      await updateActivityService(u, b, id, data);
    },
    [need]
  );
  const endActivity = useCallback(
    async (id: string, at?: Date) => {
      const { uid: u, babyId: b } = need();
      await endActivityService(u, b, id, at);
    },
    [need]
  );
  const deleteActivity = useCallback(
    async (id: string) => {
      const { uid: u, babyId: b } = need();
      await deleteBabyEntry(u, b, 'activities', id);
    },
    [need]
  );

  const addGrowth = useCallback(
    async (data: GrowthInput) => {
      const { uid: u, babyId: b } = need();
      await addGrowthRecord(u, b, data as GrowthInput & Record<string, unknown>);
      recordLogForReview();
    },
    [need]
  );
  const updateGrowth = useCallback(
    async (id: string, data: GrowthInput) => {
      const { uid: u, babyId: b } = need();
      await updateBabyEntry(u, b, 'growth', id, data as unknown as Record<string, unknown>);
    },
    [need]
  );
  const deleteGrowth = useCallback(
    async (id: string) => {
      const { uid: u, babyId: b } = need();
      await deleteBabyEntry(u, b, 'growth', id);
    },
    [need]
  );

  const addHealth = useCallback(
    async (data: HealthInput) => {
      const { uid: u, babyId: b } = need();
      await addHealthEvent(u, b, data as HealthInput & Record<string, unknown>);
      recordLogForReview();
    },
    [need]
  );
  const updateHealth = useCallback(
    async (id: string, data: HealthInput) => {
      const { uid: u, babyId: b } = need();
      await updateBabyEntry(u, b, 'health', id, data as unknown as Record<string, unknown>);
    },
    [need]
  );
  const deleteHealth = useCallback(
    async (id: string) => {
      const { uid: u, babyId: b } = need();
      await deleteBabyEntry(u, b, 'health', id);
    },
    [need]
  );

  const value = useMemo<BabyContextType>(
    () => ({
      babies,
      baby,
      activities,
      growth,
      health,
      loading,
      error,
      runningFeed,
      runningSleep,
      selectBaby,
      createBaby,
      welcomeBaby,
      updateBaby,
      deleteBaby,
      addActivity,
      updateActivity,
      endActivity,
      deleteActivity,
      addGrowth,
      updateGrowth,
      deleteGrowth,
      addHealth,
      updateHealth,
      deleteHealth,
    }),
    [
      babies,
      baby,
      activities,
      growth,
      health,
      loading,
      error,
      runningFeed,
      runningSleep,
      selectBaby,
      createBaby,
      welcomeBaby,
      updateBaby,
      deleteBaby,
      addActivity,
      updateActivity,
      endActivity,
      deleteActivity,
      addGrowth,
      updateGrowth,
      deleteGrowth,
      addHealth,
      updateHealth,
      deleteHealth,
    ]
  );

  return <BabyContext.Provider value={value}>{children}</BabyContext.Provider>;
};

export const useBaby = () => {
  const ctx = useContext(BabyContext);
  if (!ctx) throw new Error('useBaby must be used within a BabyProvider');
  return ctx;
};
