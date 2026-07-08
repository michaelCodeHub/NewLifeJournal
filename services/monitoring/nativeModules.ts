// Centralized, crash-safe lazy access to @react-native-firebase native
// modules.
//
// These packages construct a NativeEventEmitter as a side effect of being
// require()'d, and on a build where the native module isn't linked (Expo
// Go, the web build, or a dev-client build made before the
// @react-native-firebase config plugins were added to app.json), that
// construction fails. A plain try/catch around the require() call is NOT
// reliable protection against this in practice: on-device (Hermes / new
// architecture) it has been observed surfacing as an uncaught error via
// React Native's global error reporting instead of a catchable synchronous
// throw at the require() call site, even though wrapping require() in
// try/catch works fine under plain Node/Jest.
//
// So instead of "try requiring it, catch if it fails", availability is
// determined FIRST — via a plain property lookup on React Native's
// NativeModules registry, which never touches any @react-native-firebase
// JS code and therefore can't trigger that failure mode — and only once
// that check passes do we ever require() an RNFB package at all.
import { NativeModules, Platform } from 'react-native';

const isNativePlatform = Platform.OS === 'ios' || Platform.OS === 'android';

let availabilityCache: boolean | null = null;

// True only when the native RNFBAppModule is actually linked — not just
// "we're on iOS/Android". Safe to call from anywhere; result is cached
// after the first check. Every loader below gates on this before ever
// requiring an @react-native-firebase package.
export const isNativeMonitoringAvailable = (): boolean => {
  if (availabilityCache !== null) return availabilityCache;

  if (!isNativePlatform) {
    availabilityCache = false;
    return availabilityCache;
  }

  try {
    availabilityCache = !!(NativeModules as Record<string, unknown>).RNFBAppModule;
  } catch {
    availabilityCache = false;
  }

  return availabilityCache;
};

// Manual `require()` skips Babel's import-interop helper, so a CJS module
// (or a simple jest mock factory) that doesn't set `__esModule`/`default`
// itself needs the same fallback Babel would normally apply.
const interopDefault = (mod: any) => (mod && typeof mod === 'object' && 'default' in mod ? mod.default : mod);

let firebaseApp: typeof import('@react-native-firebase/app').default | null | undefined;
export const loadFirebaseApp = () => {
  if (firebaseApp !== undefined) return firebaseApp;
  if (!isNativeMonitoringAvailable()) return (firebaseApp = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    firebaseApp = interopDefault(require('@react-native-firebase/app'));
  } catch {
    firebaseApp = null;
  }
  return firebaseApp;
};

let analyticsModule: typeof import('@react-native-firebase/analytics').default | null | undefined;
export const loadAnalytics = () => {
  if (analyticsModule !== undefined) return analyticsModule;
  if (!isNativeMonitoringAvailable()) return (analyticsModule = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    analyticsModule = interopDefault(require('@react-native-firebase/analytics'));
  } catch {
    analyticsModule = null;
  }
  return analyticsModule;
};

let crashlyticsModule: typeof import('@react-native-firebase/crashlytics').default | null | undefined;
export const loadCrashlytics = () => {
  if (crashlyticsModule !== undefined) return crashlyticsModule;
  if (!isNativeMonitoringAvailable()) return (crashlyticsModule = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    crashlyticsModule = interopDefault(require('@react-native-firebase/crashlytics'));
  } catch {
    crashlyticsModule = null;
  }
  return crashlyticsModule;
};

let perfModule: typeof import('@react-native-firebase/perf').default | null | undefined;
export const loadPerf = () => {
  if (perfModule !== undefined) return perfModule;
  if (!isNativeMonitoringAvailable()) return (perfModule = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    perfModule = interopDefault(require('@react-native-firebase/perf'));
  } catch {
    perfModule = null;
  }
  return perfModule;
};
