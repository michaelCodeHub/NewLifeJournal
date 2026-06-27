import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { KickSession } from '../../types/pregnancy';

const getKickSessionsRef = (userId: string, pregnancyId: string) =>
  collection(db, 'users', userId, 'pregnancies', pregnancyId, 'kickSessions');

export const addKickSession = async (
  userId: string,
  pregnancyId: string,
  session: Omit<KickSession, 'id' | 'createdAt'>
): Promise<void> => {
  const ref = getKickSessionsRef(userId, pregnancyId);
  await addDoc(ref, { ...session, createdAt: Timestamp.now() });
};

export const subscribeToKickSessions = (
  userId: string,
  pregnancyId: string,
  callback: (sessions: KickSession[]) => void
): (() => void) => {
  const ref = getKickSessionsRef(userId, pregnancyId);
  const q = query(ref, orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KickSession));
    callback(sessions);
  });
};

export const deleteKickSession = async (
  userId: string,
  pregnancyId: string,
  sessionId: string
): Promise<void> => {
  await deleteDoc(doc(db, 'users', userId, 'pregnancies', pregnancyId, 'kickSessions', sessionId));
};
