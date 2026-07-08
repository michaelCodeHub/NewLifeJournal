// Unified error/exception logging. Use this instead of a bare console.error
// or an empty catch block anywhere in services/, context/, or app/.
//
// It does three things: keeps the console log for local dev, records the
// error to Crashlytics with context tags so it's diagnosable, and fires an
// "app_error" analytics event so error frequency shows up next to engagement
// data without needing to cross-reference two dashboards.
//
// Crashlytics is loaded lazily via loadCrashlytics() (see nativeModules.ts)
// rather than a top-level `import` — a static import throws immediately in
// any environment without the native module linked (Expo Go, web, or a
// dev-client build predating the config plugins).
import { isNativeMonitoringAvailable, loadCrashlytics } from './nativeModules';
import { trackEvent } from './analytics';

export interface ErrorContext {
  // Which screen/service the error originated from, e.g. "chat", "visits".
  screen?: string;
  // What the user/code was trying to do, e.g. "sendMessage", "addVisit".
  action?: string;
  [key: string]: string | number | boolean | undefined;
}

const toError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error('Unknown error (non-serializable)');
  }
};

// Log a caught exception. Never throws — safe to call from any catch block.
export const logError = (error: unknown, context: ErrorContext = {}, fatal = false): void => {
  const err = toError(error);
  const tag = context.screen ? `[${context.screen}]` : '';

  // eslint-disable-next-line no-console
  console.error(`[error]${tag}`, err.message, context);

  if (isNativeMonitoringAvailable()) {
    const crashlytics = loadCrashlytics();
    if (crashlytics) {
      try {
        const crash = crashlytics();
        Object.entries(context).forEach(([key, value]) => {
          if (value !== undefined) crash.setAttribute(key, String(value));
        });
        crash.recordError(err);
      } catch (loggingErr) {
        // eslint-disable-next-line no-console
        console.warn('[errorLogger] failed to record error to crashlytics', loggingErr);
      }
    }
  }

  trackEvent('app_error', {
    message: err.message.slice(0, 100),
    screen: context.screen ?? 'unknown',
    action: context.action ?? 'unknown',
    fatal,
  });
};

// Alias used for handled/expected exceptions (kept separate from logError so
// call sites can express intent — e.g. a network retry failure vs. a crash).
export const logHandledException = (error: unknown, context: ErrorContext = {}): void =>
  logError(error, context, false);
