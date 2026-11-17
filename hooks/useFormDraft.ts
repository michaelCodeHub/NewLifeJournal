import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Keeps a new-entry form on the device while it's open, so it survives the OS
 * closing the app in the background (PRD 8.4). On the next launch the draft is
 * handed to `onRestore`, which should put the values back and reopen the form.
 * Closing the form (saved or cancelled) discards the draft.
 *
 * `value` must be JSON-safe (store dates as epoch millis). Pass `key = null`
 * until the user is known.
 */
export function useFormDraft<T>(key: string | null, open: boolean, value: T, onRestore: (draft: T) => void): void {
  const [ready, setReady] = useState(false);
  const restoreRef = useRef(onRestore);
  restoreRef.current = onRestore;
  const serialized = JSON.stringify(value);

  // Read once per key, before anything can overwrite it.
  useEffect(() => {
    setReady(false);
    if (!key) return;
    let cancelled = false;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (!cancelled && raw) restoreRef.current(JSON.parse(raw) as T);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    if (!key || !ready) return;
    if (!open) {
      AsyncStorage.removeItem(key).catch(() => undefined);
      return;
    }
    const t = setTimeout(() => AsyncStorage.setItem(key, serialized).catch(() => undefined), 400);
    return () => clearTimeout(t);
  }, [key, ready, open, serialized]);
}
