import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Pregnancy, HospitalVisit, Symptom, Milestone } from '../../types';

// Helper function to calculate pregnancy week from due date
export const calculatePregnancyWeek = (dueDate: Date): number => {
  const now = new Date();
  const dueDateObj = new Date(dueDate);

  // Pregnancy is typically 40 weeks
  const conceptionDate = new Date(dueDateObj.getTime() - 40 * 7 * 24 * 60 * 60 * 1000);
  const weeksSinceConception = Math.floor((now.getTime() - conceptionDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

  // Clamp between 1 and 42 weeks
  return Math.max(1, Math.min(42, weeksSinceConception));
};

// Helper function to calculate days until due date
export const daysUntilDueDate = (dueDate: Date): number => {
  const now = new Date();
  const dueDateObj = new Date(dueDate);
  const diffTime = dueDateObj.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// ============ PREGNANCY CRUD OPERATIONS ============

// Create a new pregnancy
export const createPregnancy = async (
  userId: string,
  pregnancyData: Omit<Pregnancy, 'id' | 'createdAt' | 'updatedAt' | 'currentWeek'>
): Promise<string> => {
  try {
    const pregnancyRef = collection(db, 'users', userId, 'pregnancies');
    const currentWeek = calculatePregnancyWeek(pregnancyData.dueDate.toDate());

    const newPregnancy = {
      ...pregnancyData,
      currentWeek,
      status: 'active',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(pregnancyRef, newPregnancy);

    // Update the pregnancy document with its own ID
    await updateDoc(docRef, { id: docRef.id });

    return docRef.id;
  } catch (error) {
    console.error('Error creating pregnancy:', error);
    throw error;
  }
};

// Get active pregnancy
export const getActivePregnancy = async (userId: string): Promise<Pregnancy | null> => {
  try {
    const pregnancyRef = collection(db, 'users', userId, 'pregnancies');
    const q = query(pregnancyRef, where('status', '==', 'active'), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as Pregnancy;
  } catch (error) {
    console.error('Error getting active pregnancy:', error);
    throw error;
  }
};

// Update pregnancy
export const updatePregnancy = async (
  userId: string,
  pregnancyId: string,
  updates: Partial<Pregnancy>
): Promise<void> => {
  try {
    const pregnancyRef = doc(db, 'users', userId, 'pregnancies', pregnancyId);
    await updateDoc(pregnancyRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating pregnancy:', error);
    throw error;
  }
};

// Complete pregnancy (when baby is born)
export const completePregnancy = async (
  userId: string,
  pregnancyId: string,
  babyId?: string
): Promise<void> => {
  try {
    const pregnancyRef = doc(db, 'users', userId, 'pregnancies', pregnancyId);
    await updateDoc(pregnancyRef, {
      status: 'completed',
      completedAt: Timestamp.now(),
      transitionedToBabyId: babyId,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error completing pregnancy:', error);
    throw error;
  }
};

// Subscribe to active pregnancy (real-time updates)
export const subscribeToActivePregnancy = (
  userId: string,
  callback: (pregnancy: Pregnancy | null) => void
): (() => void) => {
  const pregnancyRef = collection(db, 'users', userId, 'pregnancies');
  const q = query(pregnancyRef, where('status', '==', 'active'), limit(1));

  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
    } else {
      callback(snapshot.docs[0].data() as Pregnancy);
    }
  });
};

// ============ HOSPITAL VISITS ============

// Add hospital visit
export const addHospitalVisit = async (
  userId: string,
  pregnancyId: string,
  visitData: Omit<HospitalVisit, 'id' | 'createdAt' | 'pregnancyId'>
): Promise<string> => {
  try {
    const visitRef = collection(db, 'users', userId, 'pregnancies', pregnancyId, 'hospitalVisits');
    const newVisit = {
      ...visitData,
      pregnancyId,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(visitRef, newVisit);
    await updateDoc(docRef, { id: docRef.id });

    return docRef.id;
  } catch (error) {
    console.error('Error adding hospital visit:', error);
    throw error;
  }
};

// Get hospital visits
export const getHospitalVisits = async (
  userId: string,
  pregnancyId: string
): Promise<HospitalVisit[]> => {
  try {
    const visitRef = collection(db, 'users', userId, 'pregnancies', pregnancyId, 'hospitalVisits');
    const q = query(visitRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => doc.data() as HospitalVisit);
  } catch (error) {
    console.error('Error getting hospital visits:', error);
    throw error;
  }
};

// Subscribe to hospital visits
export const subscribeToHospitalVisits = (
  userId: string,
  pregnancyId: string,
  callback: (visits: HospitalVisit[]) => void
): (() => void) => {
  const visitRef = collection(db, 'users', userId, 'pregnancies', pregnancyId, 'hospitalVisits');
  const q = query(visitRef, orderBy('date', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const visits = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as HospitalVisit);
    callback(visits);
  });
};

// Delete hospital visit
export const deleteHospitalVisit = async (
  userId: string,
  pregnancyId: string,
  visitId: string
): Promise<void> => {
  try {
    const visitRef = doc(db, 'users', userId, 'pregnancies', pregnancyId, 'hospitalVisits', visitId);
    await deleteDoc(visitRef);
  } catch (error) {
    console.error('Error deleting hospital visit:', error);
    throw error;
  }
};

// ============ SYMPTOMS ============

// Add symptom
export const addSymptom = async (
  userId: string,
  pregnancyId: string,
  symptomData: Omit<Symptom, 'id' | 'createdAt' | 'pregnancyId'>
): Promise<string> => {
  try {
    const symptomRef = collection(db, 'users', userId, 'pregnancies', pregnancyId, 'symptoms');
    const newSymptom = {
      ...symptomData,
      pregnancyId,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(symptomRef, newSymptom);
    await updateDoc(docRef, { id: docRef.id });

    return docRef.id;
  } catch (error) {
    console.error('Error adding symptom:', error);
    throw error;
  }
};

// Get symptoms
export const getSymptoms = async (
  userId: string,
  pregnancyId: string
): Promise<Symptom[]> => {
  try {
    const symptomRef = collection(db, 'users', userId, 'pregnancies', pregnancyId, 'symptoms');
    const q = query(symptomRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => doc.data() as Symptom);
  } catch (error) {
    console.error('Error getting symptoms:', error);
    throw error;
  }
};

// Subscribe to symptoms
export const subscribeToSymptoms = (
  userId: string,
  pregnancyId: string,
  callback: (symptoms: Symptom[]) => void
): (() => void) => {
  const symptomRef = collection(db, 'users', userId, 'pregnancies', pregnancyId, 'symptoms');
  const q = query(symptomRef, orderBy('date', 'desc'), limit(20));

  return onSnapshot(q, (snapshot) => {
    const symptoms = snapshot.docs.map((doc) => doc.data() as Symptom);
    callback(symptoms);
  });
};

// Delete symptom
export const deleteSymptom = async (
  userId: string,
  pregnancyId: string,
  symptomId: string
): Promise<void> => {
  try {
    const symptomRef = doc(db, 'users', userId, 'pregnancies', pregnancyId, 'symptoms', symptomId);
    await deleteDoc(symptomRef);
  } catch (error) {
    console.error('Error deleting symptom:', error);
    throw error;
  }
};

// ============ MILESTONES ============

// Add milestone
export const addMilestone = async (
  userId: string,
  pregnancyId: string,
  milestoneData: Omit<Milestone, 'id' | 'createdAt' | 'pregnancyId'>
): Promise<string> => {
  try {
    const milestoneRef = collection(db, 'users', userId, 'pregnancies', pregnancyId, 'milestones');
    const newMilestone = {
      ...milestoneData,
      pregnancyId,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(milestoneRef, newMilestone);
    await updateDoc(docRef, { id: docRef.id });

    return docRef.id;
  } catch (error) {
    console.error('Error adding milestone:', error);
    throw error;
  }
};

// Get milestones
export const getMilestones = async (
  userId: string,
  pregnancyId: string
): Promise<Milestone[]> => {
  try {
    const milestoneRef = collection(db, 'users', userId, 'pregnancies', pregnancyId, 'milestones');
    const q = query(milestoneRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => doc.data() as Milestone);
  } catch (error) {
    console.error('Error getting milestones:', error);
    throw error;
  }
};

// Subscribe to milestones
export const subscribeToMilestones = (
  userId: string,
  pregnancyId: string,
  callback: (milestones: Milestone[]) => void
): (() => void) => {
  const milestoneRef = collection(db, 'users', userId, 'pregnancies', pregnancyId, 'milestones');
  const q = query(milestoneRef, orderBy('date', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const milestones = snapshot.docs.map((doc) => doc.data() as Milestone);
    callback(milestones);
  });
};
