import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { ContractionSession } from '../../types/pregnancy';
import { trackEvent } from '../monitoring/analytics';
import { logError } from '../monitoring/errorLogger';

const getSessionsRef = (userId: string, pregnancyId: string) =>
  collection(db, 'users', userId, 'pregnancies', pregnancyId, 'contractionSessions');

export const saveContractionSession = async (
  userId: string,
  pregnancyId: string,
  session: Omit<ContractionSession, 'id' | 'createdAt'>
): Promise<void> => {
  try {
    await addDoc(getSessionsRef(userId, pregnancyId), { ...session, createdAt: Timestamp.now() });
    trackEvent('contraction_session_saved');
  } catch (error) {
    logError(error, { screen: 'contractionService', action: 'saveContractionSession' });
    throw error;
  }
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
  try {
    await deleteDoc(doc(db, 'users', userId, 'pregnancies', pregnancyId, 'contractionSessions', sessionId));
  } catch (error) {
    logError(error, { screen: 'contractionService', action: 'deleteContractionSession' });
    throw error;
  }
};

/** A contraction as the rule needs it: when it started (epoch ms) and how long it lasted. */
export interface TimedContraction {
  start: number;
  durationSeconds: number;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * 5-1-1 rule (PRD F14): contractions coming every 5 minutes or less (start to
 * start), each lasting at least 1 minute, kept up for at least 1 hour.
 *
 * Walks back from the latest contraction while the pattern holds, and is true
 * once that unbroken run spans an hour (first start → last end).
 */
export const check511Rule = (contractions: TimedContraction[]): boolean => {
  const n = contractions.length;
  if (n < 2) return false;
  const last = contractions[n - 1];
  if (last.durationSeconds < 60) return false;
  let first = n - 1;
  while (first > 0) {
    const prev = contractions[first - 1];
    const apart = contractions[first].start - prev.start;
    if (prev.durationSeconds < 60 || apart > 5 * 60 * 1000) break;
    first -= 1;
  }
  const span = last.start + last.durationSeconds * 1000 - contractions[first].start;
  return span >= ONE_HOUR_MS;
};

const shortDuration = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
};

/**
 * A plain-text summary to share with a doctor, midwife or partner (PRD F14):
 * "Last 10 contractions: avg 58s long, avg 4m 12s apart (start to start)."
 */
export const contractionSummary = (contractions: TimedContraction[], take = 10): string => {
  if (!contractions.length) return 'No contractions timed yet.';
  const recent = contractions.slice(-take);
  const avgLen = recent.reduce((a, c) => a + c.durationSeconds, 0) / recent.length;
  const gaps = recent.slice(1).map((c, i) => (c.start - recent[i].start) / 1000);
  const avgGap = gaps.length ? gaps.reduce((a, g) => a + g, 0) / gaps.length : 0;
  const first = new Date(contractions[0].start);
  const time = first.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const lines = [
    `Last ${recent.length} contraction${recent.length === 1 ? '' : 's'}: avg ${shortDuration(avgLen)} long` +
      (gaps.length ? `, avg ${shortDuration(avgGap)} apart (start to start).` : '.'),
    `${contractions.length} timed since ${time}.`,
  ];
  if (check511Rule(contractions)) lines.push('This meets the 5-1-1 rule (every 5 min, 1 min long, for 1 hour).');
  lines.push('Timed with Bloom & Bump.');
  return lines.join('\n');
};
