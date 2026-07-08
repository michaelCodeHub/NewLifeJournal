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

export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

// Strip undefined values — Firebase Analytics rejects them.
const cleanParams = (params?: AnalyticsParams) => {
  if (!params) return undefined;
  const cleaned: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) cleaned[key] = value;
  }
  return cleaned;
};

// Fire a custom engagement event (e.g. "visit_added", "chat_message_sent").
// Fire-and-forget by design — analytics should never block or throw into
// the calling code path.
export const trackEvent = (name: string, params?: AnalyticsParams): void => {
  if (!isNativeMonitoringAvailable()) return;
  const analytics = loadAnalytics();
  if (!analytics) return;
  analytics()
    .logEvent(name, cleanParams(params))
    .catch((err: unknown) => console.warn(`[analytics] failed to log event "${name}"`, err));
};

// Track a screen view. Call this from the root layout's navigation listener
// rather than sprinkling it through individual screens.
export const trackScreen = (screenName: string): void => {
  if (!isNativeMonitoringAvailable()) return;
  const analytics = loadAnalytics();
  if (!analytics) return;
  analytics()
    .logScreenView({ screen_name: screenName, screen_class: screenName })
    .catch((err: unknown) => console.warn(`[analytics] failed to log screen "${screenName}"`, err));
};

// Associate events/crashes with a (non-PII) user identifier. Pass the
// Firebase uid — never email or display name.
export const setAnalyticsUserId = (uid: string | null): void => {
  if (!isNativeMonitoringAvailable()) return;
  const analytics = loadAnalytics();
  if (!analytics) return;
  analytics()
    .setUserId(uid)
    .catch((err: unknown) => console.warn('[analytics] failed to set user id', err));
};

export const setAnalyticsUserProperties = (props: Record<string, string | null>): void => {
  if (!isNativeMonitoringAvailable()) return;
  const analytics = loadAnalytics();
  if (!analytics) return;
  analytics()
    .setUserProperties(props)
    .catch((err: unknown) => console.warn('[analytics] failed to set user properties', err));
};
