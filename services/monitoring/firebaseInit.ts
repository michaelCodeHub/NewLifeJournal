// Call initMonitoring() exactly once, at app startup (see app/_layout.tsx).
//
// Crash/performance collection starts OFF (firebase.json) and is switched on
// only with consent — see applyCrashConsent. This also installs global
// handlers so JS errors and unhandled promise rejections that occur outside
// React's render cycle (and therefore wouldn't be caught by ErrorBoundary)
// still get logged.
//
// Crashlytics/Perf are loaded lazily via loadCrashlytics()/loadPerf() (see
// nativeModules.ts) rather than top-level `import`s — a static import
// throws immediately in any environment without the native module linked
// (Expo Go, web, or a dev-client build predating the config plugins).
import { isNativeMonitoringAvailable, loadCrashlytics, loadPerf } from './nativeModules';
import { logError } from './errorLogger';
import { getConsent } from './consent';

let initialized = false;

/**
 * Turn crash reporting and performance monitoring on or off to match the
 * user's choice (Profile → Privacy → "Send crash reports"). Off by default.
 */
export const applyCrashConsent = (enabled: boolean): void => {
  if (!isNativeMonitoringAvailable()) return;
  try {
    loadCrashlytics()
      ?.()
      .setCrashlyticsCollectionEnabled(enabled)
      .catch((err: unknown) => console.warn('[monitoring] failed to update crashlytics collection', err));
    loadPerf()
      ?.()
      .setPerformanceCollectionEnabled(enabled)
      .catch((err: unknown) => console.warn('[monitoring] failed to update perf collection', err));
  } catch (err) {
    console.warn('[monitoring] native firebase modules unavailable', err);
  }
};

/** True when errors may be sent to Crashlytics. */
export const canReportCrashes = () => getConsent().crashReports && isNativeMonitoringAvailable();

export const initMonitoring = (): void => {
  if (initialized) return;
  initialized = true;


  // Catch JS errors thrown outside React's render cycle (timers, event
  // handlers, non-awaited promises) — ErrorBoundary only sees render errors.
  const globalObj = global as any;
  const errorUtils = globalObj.ErrorUtils;
  if (errorUtils?.setGlobalHandler) {
    const previousHandler = errorUtils.getGlobalHandler?.();
    errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      logError(error, { screen: 'global', action: 'uncaughtException' }, !!isFatal);
      previousHandler?.(error, isFatal);
    });
  }

  // Catch unhandled promise rejections.
  if (typeof globalObj.addEventListener === 'function') {
    globalObj.addEventListener('unhandledrejection', (event: any) => {
      logError(event?.reason ?? event, { screen: 'global', action: 'unhandledRejection' });
    });
  } else if (globalObj.process?.on) {
    globalObj.process.on('unhandledRejection', (reason: unknown) => {
      logError(reason, { screen: 'global', action: 'unhandledRejection' });
    });
  }
};
