import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { ContractionSession } from '../../types/pregnancy';

const getSessionsRef = (userId: string, pregnancyId: string) =>
  collection(db, 'users', userId, 'pregnancies', pregnancyId, 'contractionSessions');

export const saveContractionSession = async (
  userId: string,
  pregnancyId: string,
  session: Omit<ContractionSession, 'id' | 'createdAt'>
): Promise<void> => {
  await addDoc(getSessionsRef(userId, pregnancyId), { ...session, createdAt: Timestamp.now() });
};

export const subscribeToContractionSessions = (
  userId: string,
  pregnancyId: string,
  callback: (sessions: ContractionSession[]) => void
): (() => void) => {
  const q = query(getSessionsRef(userId, pregnancyId), orderBy('date', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ContractionSession)));
  });
};

export const deleteContractionSession = async (
  userId: string,
  pregnancyId: string,
  sessionId: string
): Promise<void> => {
  await deleteDoc(doc(db, 'users', userId, 'pregnancies', pregnancyId, 'contractionSessions', sessionId));
};

// 5-1-1 rule: contractions <= 5 min apart, >= 1 min long, for >= 1 hour
export const check511Rule = (contractions: { durationSeconds: number; intervalSeconds?: number }[]): boolean => {
  if (contractions.length < 3) return false;
  const recent = contractions.slice(-6); // last 6 contractions
  const allLongEnough = recent.every(c => c.durationSeconds >= 60);
  const allCloseEnough = recent.every(c => (c.intervalSeconds ?? Infinity) <= 300);
  return allLongEnough && allCloseEnough;
};
