import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  createPregnancy: (data: PregnancyFormData) => Promise<void>;
  updatePregnancy: (updates: Partial<Pregnancy>) => Promise<void>;
  addHospitalVisit: (visit: HospitalVisitFormData) => Promise<void>;
  addSymptom: (symptom: SymptomFormData) => Promise<void>;
  addMilestone: (milestone: MilestoneFormData) => Promise<void>;
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
  notes?: string;
  weight?: number;
  bloodPressure?: string;
  nextVisitDate?: Date;
}

interface SymptomFormData {
  date: Date;
  type: 'nausea' | 'fatigue' | 'headache' | 'back_pain' | 'other';
  severity: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

interface MilestoneFormData {
  date: Date;
  title: string;
  description?: string;
  imageUrl?: string;
}

const PregnancyContext = createContext<PregnancyContextType | undefined>(undefined);

export const PregnancyProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [pregnancy, setPregnancy] = useState<Pregnancy | null>(null);
  const [hospitalVisits, setHospitalVisits] = useState<HospitalVisit[]>([]);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to active pregnancy
  useEffect(() => {
    if (!user) {
      setPregnancy(null);
      setHospitalVisits([]);
      setSymptoms([]);
      setMilestones([]);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToActivePregnancy(user.uid, (pregnancyData) => {
      setPregnancy(pregnancyData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Subscribe to hospital visits
  useEffect(() => {
    if (!user || !pregnancy || !pregnancy.id) {
      setHospitalVisits([]);
      return;
    }

    const unsubscribe = subscribeToHospitalVisits(user.uid, pregnancy.id, setHospitalVisits);
    return () => unsubscribe();
  }, [user, pregnancy]);

  // Subscribe to symptoms
  useEffect(() => {
    if (!user || !pregnancy || !pregnancy.id) {
      setSymptoms([]);
      return;
    }

    const unsubscribe = subscribeToSymptoms(user.uid, pregnancy.id, setSymptoms);
    return () => unsubscribe();
  }, [user, pregnancy]);

  // Subscribe to milestones
  useEffect(() => {
    if (!user || !pregnancy || !pregnancy.id) {
      setMilestones([]);
      return;
    }

    const unsubscribe = subscribeToMilestones(user.uid, pregnancy.id, setMilestones);
    return () => unsubscribe();
  }, [user, pregnancy]);

  // Create pregnancy
  const createPregnancy = async (data: PregnancyFormData) => {
    if (!user) throw new Error('User not authenticated');

    const pregnancyData: any = {
      motherName: data.motherName,
      dueDate: Timestamp.fromDate(data.dueDate),
      status: 'active' as const,
    };

    // Only add optional fields if they have values
    if (data.babyName) pregnancyData.babyName = data.babyName;
    if (data.hospital) pregnancyData.hospital = data.hospital;
    if (data.doctorName) pregnancyData.doctorName = data.doctorName;
    if (data.doctorPhone) pregnancyData.doctorPhone = data.doctorPhone;
    if (data.bloodType) pregnancyData.bloodType = data.bloodType;

    await createPregnancyService(user.uid, pregnancyData);
  };

  // Update pregnancy
  const updatePregnancy = async (updates: Partial<Pregnancy>) => {
    if (!user || !pregnancy) throw new Error('No active pregnancy');
    await updatePregnancyService(user.uid, pregnancy.id, updates);
  };

  // Add hospital visit
  const addHospitalVisit = async (visit: HospitalVisitFormData) => {
    if (!user || !pregnancy) throw new Error('No active pregnancy');

    const currentWeek = getCurrentWeek();
    const visitData = {
      date: Timestamp.fromDate(visit.date),
      week: currentWeek,
      type: visit.type,
      notes: visit.notes,
      weight: visit.weight,
      bloodPressure: visit.bloodPressure,
      nextVisitDate: visit.nextVisitDate ? Timestamp.fromDate(visit.nextVisitDate) : undefined,
    };

    await addHospitalVisitService(user.uid, pregnancy.id, visitData);
  };

  // Add symptom
  const addSymptom = async (symptom: SymptomFormData) => {
    if (!user || !pregnancy) throw new Error('No active pregnancy');

    const currentWeek = getCurrentWeek();
    const symptomData = {
      date: Timestamp.fromDate(symptom.date),
      week: currentWeek,
      type: symptom.type,
      severity: symptom.severity,
      notes: symptom.notes,
    };

    await addSymptomService(user.uid, pregnancy.id, symptomData);
  };

  // Add milestone
  const addMilestone = async (milestone: MilestoneFormData) => {
    if (!user || !pregnancy) throw new Error('No active pregnancy');

    const currentWeek = getCurrentWeek();
    const milestoneData = {
      date: Timestamp.fromDate(milestone.date),
      week: currentWeek,
      title: milestone.title,
      description: milestone.description,
      imageUrl: milestone.imageUrl,
    };

    await addMilestoneService(user.uid, pregnancy.id, milestoneData);
  };

  // Get current week
  const getCurrentWeek = (): number => {
    if (!pregnancy) return 0;
    return calculatePregnancyWeek(pregnancy.dueDate.toDate());
  };

  // Get days until due date
  const getDaysUntilDue = (): number => {
    if (!pregnancy) return 0;
    return daysUntilDueDate(pregnancy.dueDate.toDate());
  };

  const value: PregnancyContextType = {
    pregnancy,
    hospitalVisits,
    symptoms,
    milestones,
    loading,
    createPregnancy,
    updatePregnancy,
    addHospitalVisit,
    addSymptom,
    addMilestone,
    getCurrentWeek,
    getDaysUntilDue,
  };

  return <PregnancyContext.Provider value={value}>{children}</PregnancyContext.Provider>;
};

export const usePregnancy = () => {
  const context = useContext(PregnancyContext);
  if (context === undefined) {
    throw new Error('usePregnancy must be used within a PregnancyProvider');
  }
  return context;
};
