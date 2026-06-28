// config/firestoreCache.ts
// Call enableFirestoreCache() once at app startup to activate offline support.
// Safe to call multiple times — guards with a module-level flag.
//
// Firebase JS SDK v12 (Firestore v10+) for React Native supports persistent
// local cache via `persistentLocalCache` passed to `initializeFirestore`.
// However, config/firebase.ts is owned by another engineer — do NOT modify it.
//
// Current state: firebase.ts already calls initializeFirestore with
//   { cacheSizeBytes: -1 }
// which enables the unlimited in-memory cache. True cross-session persistence
// on React Native requires passing:
//   { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }
// to initializeFirestore — this can be adopted in firebase.ts when appropriate.
//
// This file exposes network control utilities (go offline / go online) that
// can be used by the app to force Firestore into local-only mode when the
// device loses connectivity.

import { enableNetwork, disableNetwork } from 'firebase/firestore';
import { db } from './firebase';

let cacheEnabled = false;

export const enableFirestoreCache = async (): Promise<void> => {
  if (cacheEnabled) return;
  cacheEnabled = true;
  // Firestore's in-memory cache is already active via initializeFirestore.
  // No additional runtime step is needed here.
  console.log('[Firestore] Offline cache active (in-memory, unlimited size)');
};

/**
 * Stop Firestore from making any network requests.
 * Reads will be served from the local cache; writes will be queued.
 */
export const goOffline = async (): Promise<void> => {
  await disableNetwork(db);
};

/**
 * Re-enable Firestore network access.
 * Queued writes will be flushed and listeners will resume live updates.
 */
export const goOnline = async (): Promise<void> => {
  await enableNetwork(db);
};
