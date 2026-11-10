// Thin wrapper around @react-native-firebase/analytics.
//
// Every call site in the app should import trackEvent/trackScreen/etc from
// HERE, never straight from '@react-native-firebase/analytics'. That keeps
// the rest of the codebase decoupled from the underlying analytics provider
// in case it's ever swapped out.
//
// The actual native module is loaded lazily via loadAnalytics() (see
// nativeModules.ts) rather than a top-level `import` — a static import
// throws immediately in any environment without the native module linked
// (Expo Go, web, or a dev-client build predating the config plugins).
import { isNativeMonitoringAvailable, loadAnalytics } from './nativeModules';
import { getConsent } from './consent';

export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

/**
 * PRIVACY: analytics may only ever carry these non-health parameters. Anything
 * else (pregnancy week, symptom type, severity, visit type, kick/contraction
 * counts, error text…) is dropped here, so a careless call site can't leak
 * health data to a third party. Add a key only if it can never describe the
 * user's body, pregnancy or care.
 */
const ALLOWED_PARAMS = new Set(['method', 'success', 'response_time_ms', 'screen', 'action', 'fatal', 'source']);

// Keep allowlisted keys, strip undefined values (Firebase Analytics rejects them).
const cleanParams = (params?: AnalyticsParams) => {
  if (!params) return undefined;
  const cleaned: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && ALLOWED_PARAMS.has(key)) cleaned[key] = value;
  }
  return cleaned;
};

/** Only send anything when the user opted in (Profile → Share anonymous usage). */
const canTrack = () => getConsent().analytics && isNativeMonitoringAvailable();

/** Apply the user's analytics choice to the native SDK (auto-collection is off by default in firebase.json). */
export const applyAnalyticsConsent = (enabled: boolean): void => {
  if (!isNativeMonitoringAvailable()) return;
  const analytics = loadAnalytics();
  if (!analytics) return;
  analytics()
    .setAnalyticsCollectionEnabled(enabled)
    .catch((err: unknown) => console.warn('[analytics] failed to update collection setting', err));
};

// Fire a custom engagement event (e.g. "visit_added", "chat_message_sent").
// Fire-and-forget by design — analytics should never block or throw into
// the calling code path.
export const trackEvent = (name: string, params?: AnalyticsParams): void => {
  if (!canTrack()) return;
  const analytics = loadAnalytics();
  if (!analytics) return;
  analytics()
    .logEvent(name, cleanParams(params))
    .catch((err: unknown) => console.warn(`[analytics] failed to log event "${name}"`, err));
};

// Track a screen view. Call this from the root layout's navigation listener
// rather than sprinkling it through individual screens.
export const trackScreen = (screenName: string): void => {
  if (!canTrack()) return;
  const analytics = loadAnalytics();
  if (!analytics) return;
  analytics()
    .logScreenView({ screen_name: screenName, screen_class: screenName })
    .catch((err: unknown) => console.warn(`[analytics] failed to log screen "${screenName}"`, err));
};

// Associate events/crashes with a (non-PII) user identifier. Pass the
// Firebase uid — never email or display name.
export const setAnalyticsUserId = (uid: string | null): void => {
  if (!canTrack()) return;
  const analytics = loadAnalytics();
  if (!analytics) return;
  analytics()
    .setUserId(uid)
    .catch((err: unknown) => console.warn('[analytics] failed to set user id', err));
};

export const setAnalyticsUserProperties = (props: Record<string, string | null>): void => {
  if (!canTrack()) return;
  const analytics = loadAnalytics();
  if (!analytics) return;
  analytics()
    .setUserProperties(props)
    .catch((err: unknown) => console.warn('[analytics] failed to set user properties', err));
};
