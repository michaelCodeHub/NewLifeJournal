import { initializeApp, getApps, getApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: Constants.expoConfig?.extra?.firebaseAppId || process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase app (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with React Native AsyncStorage persistence
// getReactNativePersistence is resolved from @firebase/auth's RN bundle at runtime
// We import it via a dynamic require to avoid the broken TS type declaration path
let auth: Auth;
try {
  // Metro resolves `@firebase/auth` to its React Native build via the package's
  // "react-native" export condition, which exposes getReactNativePersistence.
  // (It is absent from the web type defs, hence the typed require.) The old
  // `@firebase/auth/react-native` subpath does not exist in firebase v12's
  // exports map, so requiring it threw and silently fell back to in-memory
  // persistence — logging users out between sessions.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getReactNativePersistence } = require('@firebase/auth') as {
    getReactNativePersistence?: (storage: typeof AsyncStorage) => any;
  };
  if (!getReactNativePersistence) {
    throw new Error('getReactNativePersistence unavailable');
  }
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Auth already initialized (e.g. hot reload) — just get the existing instance
  auth = getAuth(app);
}

// Initialize Firestore with offline persistence support
const db = initializeFirestore(app, {
  cacheSizeBytes: -1, // Unlimited cache size for offline support
});

// Initialize Storage
const storage = getStorage(app);

// Dev-only: route auth + firestore to local emulators when EXPO_PUBLIC_USE_EMULATOR=1.
// This keeps production data untouched while testing the authenticated flow.
if (process.env.EXPO_PUBLIC_USE_EMULATOR === '1') {
  const host =
    typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : 'localhost';
  try {
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
    // eslint-disable-next-line no-console
    console.log('🔧 Firebase emulators connected at', host);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Emulator connection skipped:', e);
  }
}

export { auth, db, app, storage };
