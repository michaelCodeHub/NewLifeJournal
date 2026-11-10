import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { Pregnancy, HospitalVisit, Symptom, Milestone } from '../types';
import { useAuth } from './AuthContext';
import {
  subscribeToActivePregnancy,
  subscribeToHospitalVisits,
  subscribeToSymptoms,
  subscribeToMilestones,
  createPregnancy as createPregnancyService,
  updatePregnancy as updatePregnancyService,
  addHospitalVisit as addHospitalVisitService,
  addSymptom as addSymptomService,
  addMilestone as addMilestoneService,
  deleteHospitalVisit as deleteHospitalVisitService,
  deleteSymptom as deleteSymptomService,
  deleteMilestone as deleteMilestoneService,
  calculatePregnancyWeek,
  daysUntilDueDate,
} from '../services/firebase/pregnancyService';
import { Timestamp } from 'firebase/firestore';

interface PregnancyContextType {
  pregnancy: Pregnancy | null;
  hospitalVisits: HospitalVisit[];
  symptoms: Symptom[];
  milestones: Milestone[];
  loading: boolean;
  /** Set when the pregnancy listener fails (rules, network) so screens can show an error instead of spinning. */
  error: string | null;
  createPregnancy: (data: PregnancyFormData) => Promise<void>;
  updatePregnancy: (updates: Partial<Pregnancy>) => Promise<void>;
  addHospitalVisit: (visit: HospitalVisitFormData) => Promise<void>;
  addSymptom: (symptom: SymptomFormData) => Promise<void>;
  addMilestone: (milestone: MilestoneFormData) => Promise<void>;
  deleteHospitalVisit: (visitId: string) => Promise<void>;
  deleteSymptom: (symptomId: string) => Promise<void>;
  deleteMilestone: (milestoneId: string) => Promise<void>;
  getCurrentWeek: () => number;
  getDaysUntilDue: () => number;
}

interface PregnancyFormData {
  motherName: string;
  dueDate: Date;
  babyName?: string;
  hospital?: string;
  doctorName?: string;
  doctorPhone?: string;
  bloodType?: string;
}

interface HospitalVisitFormData {
  date: Date;
  type: 'checkup' | 'ultrasound' | 'test' | 'emergency';
  label?: string;
  notes?: string;
  weight?: number;
  bloodPressure?: string;
  nextVisitDate?: Date;
}

interface SymptomFormData {
  date: Date;
  type: Symptom['type'];
  label?: string;
  severity: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

interface MilestoneFormData {
  date: Date;
  title: string;
  description?: string;
  imageUrl?: string;
}

/** Firestore rejects `undefined` values, so drop them before writing. */
function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

const PregnancyContext = createContext<PregnancyContextType | undefined>(undefined);

export const PregnancyProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [pregnancy, setPregnancy] = useState<Pregnancy | null>(null);
  const [hospitalVisits, setHospitalVisits] = useState<HospitalVisit[]>([]);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pregnancyId = pregnancy?.id ?? null;

  // Active pregnancy
  useEffect(() => {
    if (!uid) {
      setPregnancy(null);
      setHospitalVisits([]);
      setSymptoms([]);
      setMilestones([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeToActivePregnancy(
      uid,
      (data) => {
        setPregnancy(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Could not load your pregnancy.');
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [uid]);

  // Sub-collections are keyed on the pregnancy *id*, not the object, so a write
  // to the pregnancy doc doesn't tear down and rebuild every listener.
  useEffect(() => {
    if (!uid || !pregnancyId) {
      setHospitalVisits([]);
      return;
    }
    return subscribeToHospitalVisits(uid, pregnancyId, setHospitalVisits);
  }, [uid, pregnancyId]);

  useEffect(() => {
    if (!uid || !pregnancyId) {
      setSymptoms([]);
      return;
    }
    return subscribeToSymptoms(uid, pregnancyId, setSymptoms);
  }, [uid, pregnancyId]);

  useEffect(() => {
    if (!uid || !pregnancyId) {
      setMilestones([]);
      return;
    }
    return subscribeToMilestones(uid, pregnancyId, setMilestones);
  }, [uid, pregnancyId]);

  const dueMillis = pregnancy?.dueDate?.toMillis?.() ?? null;

  const getCurrentWeek = useCallback((): number => {
    if (!dueMillis) return 0;
    return calculatePregnancyWeek(new Date(dueMillis));
  }, [dueMillis]);

  const getDaysUntilDue = useCallback((): number => {
    if (!dueMillis) return 0;
    return daysUntilDueDate(new Date(dueMillis));
  }, [dueMillis]);

  const createPregnancy = useCallback(
    async (data: PregnancyFormData) => {
      if (!uid) throw new Error('User not authenticated');
      const pregnancyData: any = compact({
        motherName: data.motherName,
        dueDate: Timestamp.fromDate(data.dueDate),
        status: 'active' as const,
        babyName: data.babyName || undefined,
        hospital: data.hospital || undefined,
        doctorName: data.doctorName || undefined,
        doctorPhone: data.doctorPhone || undefined,
        bloodType: data.bloodType || undefined,
      });
      await createPregnancyService(uid, pregnancyData);
    },
    [uid]
  );

  const updatePregnancy = useCallback(
    async (updates: Partial<Pregnancy>) => {
      if (!uid || !pregnancyId) throw new Error('No active pregnancy');
      await updatePregnancyService(uid, pregnancyId, updates);
    },
    [uid, pregnancyId]
  );

  const addHospitalVisit = useCallback(
    async (visit: HospitalVisitFormData) => {
      if (!uid || !pregnancyId || !dueMillis) throw new Error('No active pregnancy');
      await addHospitalVisitService(
        uid,
        pregnancyId,
        compact({
          date: Timestamp.fromDate(visit.date),
          week: weekForDate(dueMillis, visit.date),
          type: visit.type,
          label: visit.label || undefined,
          notes: visit.notes || undefined,
          weight: visit.weight,
          bloodPressure: visit.bloodPressure || undefined,
          nextVisitDate: visit.nextVisitDate ? Timestamp.fromDate(visit.nextVisitDate) : undefined,
        }) as any
      );
    },
    [uid, pregnancyId, dueMillis]
  );

  const addSymptom = useCallback(
    async (symptom: SymptomFormData) => {
      if (!uid || !pregnancyId || !dueMillis) throw new Error('No active pregnancy');
      await addSymptomService(
        uid,
        pregnancyId,
        compact({
          date: Timestamp.fromDate(symptom.date),
          week: weekForDate(dueMillis, symptom.date),
          type: symptom.type,
          label: symptom.label || undefined,
          severity: symptom.severity,
          notes: symptom.notes || undefined,
        }) as any
      );
    },
    [uid, pregnancyId, dueMillis]
  );

  const addMilestone = useCallback(
    async (milestone: MilestoneFormData) => {
      if (!uid || !pregnancyId || !dueMillis) throw new Error('No active pregnancy');
      await addMilestoneService(
        uid,
        pregnancyId,
        compact({
          date: Timestamp.fromDate(milestone.date),
          week: weekForDate(dueMillis, milestone.date),
          title: milestone.title,
          description: milestone.description || undefined,
          imageUrl: milestone.imageUrl || undefined,
        }) as any
      );
    },
    [uid, pregnancyId, dueMillis]
  );

  const deleteHospitalVisit = useCallback(
    async (visitId: string) => {
      if (!uid || !pregnancyId) throw new Error('No active pregnancy');
      await deleteHospitalVisitService(uid, pregnancyId, visitId);
    },
    [uid, pregnancyId]
  );

  const deleteSymptom = useCallback(
    async (symptomId: string) => {
      if (!uid || !pregnancyId) throw new Error('No active pregnancy');
      await deleteSymptomService(uid, pregnancyId, symptomId);
    },
    [uid, pregnancyId]
  );

  const deleteMilestone = useCallback(
    async (milestoneId: string) => {
      if (!uid || !pregnancyId) throw new Error('No active pregnancy');
      await deleteMilestoneService(uid, pregnancyId, milestoneId);
    },
    [uid, pregnancyId]
  );

  const value = useMemo<PregnancyContextType>(
    () => ({
      pregnancy,
      hospitalVisits,
      symptoms,
      milestones,
      loading,
      error,
      createPregnancy,
      updatePregnancy,
      addHospitalVisit,
      addSymptom,
      addMilestone,
      deleteHospitalVisit,
      deleteSymptom,
      deleteMilestone,
      getCurrentWeek,
      getDaysUntilDue,
    }),
    [
      pregnancy,
      hospitalVisits,
      symptoms,
      milestones,
      loading,
      error,
      createPregnancy,
      updatePregnancy,
      addHospitalVisit,
      addSymptom,
      addMilestone,
      deleteHospitalVisit,
      deleteSymptom,
      deleteMilestone,
      getCurrentWeek,
      getDaysUntilDue,
    ]
  );

  return <PregnancyContext.Provider value={value}>{children}</PregnancyContext.Provider>;
};

/** Pregnancy week for an event on `date`, given the due date (same convention as calculatePregnancyWeek). */
export function weekForDate(dueMillis: number, date: Date): number {
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const lmp = dueMillis - 40 * WEEK;
  const w = Math.floor((date.getTime() - lmp) / WEEK);
  return Math.max(1, Math.min(42, w));
}

export const usePregnancy = () => {
  const context = useContext(PregnancyContext);
  if (context === undefined) {
    throw new Error('usePregnancy must be used within a PregnancyProvider');
  }
  return context;
};
