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
  deleteField,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Pregnancy, HospitalVisit, Symptom, Milestone } from '../../types';
import { trackEvent } from '../monitoring/analytics';
import { logError } from '../monitoring/errorLogger';

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

    trackEvent('pregnancy_created');
    return docRef.id;
  } catch (error) {
    logError(error, { screen: 'pregnancyService', action: 'createPregnancy' });
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
    logError(error, { screen: 'pregnancyService', action: 'getActivePregnancy' });
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
    logError(error, { screen: 'pregnancyService', action: 'updatePregnancy' });
    throw error;
  }
};

// Complete pregnancy (when baby is born)
export const completePregnancy = async (
  userId: string,
  pregnancyId: string,
  birthDate: Date = new Date(),
  babyId?: string
): Promise<void> => {
  try {
    const pregnancyRef = doc(db, 'users', userId, 'pregnancies', pregnancyId);
    await updateDoc(pregnancyRef, {
      status: 'completed',
      completedAt: Timestamp.now(),
      birthDate: Timestamp.fromDate(birthDate),
      ...(babyId ? { transitionedToBabyId: babyId } : {}),
      updatedAt: Timestamp.now(),
    });
    trackEvent('pregnancy_completed');
  } catch (error) {
    logError(error, { screen: 'pregnancyService', action: 'completePregnancy' });
    throw error;
  }
};

// Subscribe to active pregnancy (real-time updates)
export const subscribeToActivePregnancy = (
  userId: string,
  callback: (pregnancy: Pregnancy | null) => void,
  onError?: (error: Error) => void
): (() => void) => {
  const pregnancyRef = collection(db, 'users', userId, 'pregnancies');
  const q = query(pregnancyRef, where('status', '==', 'active'), limit(1));

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        callback(null);
      } else {
        const d = snapshot.docs[0];
        callback({ ...d.data(), id: d.id } as Pregnancy);
      }
    },
    (error) => {
      logError(error, { screen: 'pregnancy', action: 'subscribeToActivePregnancy' });
      onError?.(error);
    }
  );
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

    trackEvent('visit_added');
    return docRef.id;
  } catch (error) {
    logError(error, { screen: 'pregnancyService', action: 'addHospitalVisit' });
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
    logError(error, { screen: 'pregnancyService', action: 'getHospitalVisits' });
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

  return onSnapshot(
    q,
    (snapshot) => {
      const visits = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as HospitalVisit);
      callback(visits);
    },
    (error) => logError(error, { screen: 'pregnancy', action: 'subscribeToHospitalVisits' })
  );
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
    trackEvent('visit_deleted');
  } catch (error) {
    logError(error, { screen: 'pregnancyService', action: 'deleteHospitalVisit' });
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

    trackEvent('symptom_logged');
    return docRef.id;
  } catch (error) {
    logError(error, { screen: 'pregnancyService', action: 'addSymptom' });
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
    logError(error, { screen: 'pregnancyService', action: 'getSymptoms' });
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
  // No limit: timeline, charts, export and the AI all need the full history.
  const q = query(symptomRef, orderBy('date', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const symptoms = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Symptom);
      callback(symptoms);
    },
    (error) => logError(error, { screen: 'pregnancy', action: 'subscribeToSymptoms' })
  );
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
    trackEvent('symptom_deleted');
  } catch (error) {
    logError(error, { screen: 'pregnancyService', action: 'deleteSymptom' });
    throw error;
  }
};

// ============ MILESTONES ============

export const deleteMilestone = async (userId: string, pregnancyId: string, milestoneId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'pregnancies', pregnancyId, 'milestones', milestoneId));
    trackEvent('milestone_deleted');
  } catch (error) {
    logError(error, { screen: 'pregnancyService', action: 'deleteMilestone' });
    throw error;
  }
};

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

    trackEvent('milestone_added');
    return docRef.id;
  } catch (error) {
    logError(error, { screen: 'pregnancyService', action: 'addMilestone' });
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
    logError(error, { screen: 'pregnancyService', action: 'getMilestones' });
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

  return onSnapshot(
    q,
    (snapshot) => {
      const milestones = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Milestone);
      callback(milestones);
    },
    (error) => logError(error, { screen: 'pregnancy', action: 'subscribeToMilestones' })
  );
};

// ============ EDITING ============

type EntryCollection = 'hospitalVisits' | 'symptoms' | 'milestones';

const EDIT_EVENT: Record<EntryCollection, string> = {
  hospitalVisits: 'visit_edited',
  symptoms: 'symptom_edited',
  milestones: 'milestone_edited',
};

/**
 * Updates one journal entry. `undefined` values mean "the user cleared this
 * field" and are removed from the document (Firestore rejects undefined).
 */
export const updateEntry = async (
  userId: string,
  pregnancyId: string,
  collectionName: EntryCollection,
  entryId: string,
  updates: Record<string, unknown>
): Promise<void> => {
  try {
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) payload[k] = v === undefined ? deleteField() : v;
    payload.updatedAt = Timestamp.now();
    await updateDoc(doc(db, 'users', userId, 'pregnancies', pregnancyId, collectionName, entryId), payload);
    trackEvent(EDIT_EVENT[collectionName]);
  } catch (error) {
    logError(error, { screen: 'pregnancyService', action: `update:${collectionName}` });
    throw error;
  }
};

/**
 * After the due date changes, every entry's stored `week` is recalculated from
 * its own date so the timeline groups stay right. Batched in chunks under
 * Firestore's 500-writes-per-batch limit.
 */
export const recalculateEntryWeeks = async (
  userId: string,
  pregnancyId: string,
  weekOf: (date: Date) => number
): Promise<void> => {
  try {
    const updates: { ref: ReturnType<typeof doc>; week: number }[] = [];
    for (const name of ['hospitalVisits', 'symptoms', 'milestones'] as EntryCollection[]) {
      const snap = await getDocs(collection(db, 'users', userId, 'pregnancies', pregnancyId, name));
      snap.docs.forEach((d) => {
        const date = d.data().date;
        if (!date || typeof date.toDate !== 'function') return;
        const week = weekOf(date.toDate());
        if (d.data().week !== week) updates.push({ ref: d.ref, week });
      });
    }
    for (let i = 0; i < updates.length; i += 450) {
      const batch = writeBatch(db);
      updates.slice(i, i + 450).forEach((u) => batch.update(u.ref, { week: u.week }));
      await batch.commit();
    }
  } catch (error) {
    logError(error, { screen: 'pregnancyService', action: 'recalculateEntryWeeks' });
    throw error;
  }
};

/** Updates pregnancy details; `undefined` clears an optional field. */
export const updatePregnancyDetails = async (
  userId: string,
  pregnancyId: string,
  updates: Record<string, unknown>
): Promise<void> => {
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) payload[k] = v === undefined ? deleteField() : v;
  await updatePregnancy(userId, pregnancyId, payload as Partial<Pregnancy>);
  trackEvent('pregnancy_edited');
};

/** Undo "baby has arrived": the pregnancy becomes the active one again. */
export const reopenPregnancy = async (userId: string, pregnancyId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', userId, 'pregnancies', pregnancyId), {
      status: 'active',
      completedAt: deleteField(),
      birthDate: deleteField(),
      transitionedToBabyId: deleteField(),
      updatedAt: Timestamp.now(),
    });
    trackEvent('pregnancy_reopened');
  } catch (error) {
    logError(error, { screen: 'pregnancyService', action: 'reopenPregnancy' });
    throw error;
  }
};

/**
 * All of the user's pregnancies (a handful at most). The context picks the
 * active one, or else the most recently completed one, so a finished journal
 * stays readable after the baby arrives.
 */
export const subscribeToPregnancies = (
  userId: string,
  callback: (pregnancies: Pregnancy[]) => void,
  onError?: (error: Error) => void
): (() => void) =>
  onSnapshot(
    collection(db, 'users', userId, 'pregnancies'),
    (snapshot) => callback(snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as Pregnancy)),
    (error) => {
      logError(error, { screen: 'pregnancy', action: 'subscribeToPregnancies' });
      onError?.(error);
    }
  );
