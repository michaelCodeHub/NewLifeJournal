// Superseded by nativeModules.ts, which fixes a real crash this file's
// original version had: it did `import firebase from '@react-native-firebase/app'`
// at the top level, which throws synchronously in any environment where the
// native module isn't linked (Expo Go, web, or a dev-client build predating
// the config plugins) — before the runtime Platform/try-catch check below it
// ever got a chance to run. nativeModules.ts fixes this by lazy-requiring
// every RNFB package instead of statically importing it.
//
// Kept as a thin re-export so nothing needs to change if it's referenced
// elsewhere.
export { isNativeMonitoringAvailable } from './nativeModules';
