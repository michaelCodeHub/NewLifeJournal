// Wraps a network round-trip (currently used for the AI chat request) in a
// named Firebase Performance trace, so it's distinguishable from the
// automatic Firestore/HTTP instrumentation that @react-native-firebase/perf
// already captures for every fetch() call in the app.
//
// Perf is loaded lazily via loadPerf() (see nativeModules.ts) rather than a
// top-level `import` — a static import throws immediately in any
// environment without the native module linked (Expo Go, web, or a
// dev-client build predating the config plugins).
import { isNativeMonitoringAvailable, loadPerf } from './nativeModules';
import { logHandledException } from './errorLogger';

export const withNetworkTrace = async <T>(
  traceName: string,
  attributes: Record<string, string>,
  fn: () => Promise<T>
): Promise<T> => {
  const perf = isNativeMonitoringAvailable() ? loadPerf() : null;
  if (!perf) {
    return fn();
  }

  let trace: Awaited<ReturnType<ReturnType<typeof perf>['startTrace']>> | null = null;
  try {
    trace = await perf().startTrace(traceName);
    Object.entries(attributes).forEach(([key, value]) => trace!.putAttribute(key, value));
  } catch (err) {
    logHandledException(err, { screen: 'monitoring', action: `startTrace:${traceName}` });
    trace = null;
  }

  const startedAt = Date.now();
  try {
    const result = await fn();
    if (trace) {
      trace.putAttribute('outcome', 'success');
      trace.putMetric('duration_ms', Date.now() - startedAt);
      await trace.stop();
    }
    return result;
  } catch (err) {
    if (trace) {
      trace.putAttribute('outcome', 'error');
      trace.putMetric('duration_ms', Date.now() - startedAt);
      await trace.stop().catch(() => undefined);
    }
    throw err;
  }
};
