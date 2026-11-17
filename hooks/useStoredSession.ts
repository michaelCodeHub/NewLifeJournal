import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * An in-progress session (kick count, contraction timing) kept on the device,
 * so leaving the screen or restarting the app doesn't lose it. `key` should
 * include the user and pregnancy ids; pass null while they aren't known.
 *
 * Returns [value, save, clear, restored]. `restored` is false until storage has
 * been read, so screens don't flash an empty state over a session that exists.
 */
export function useStoredSession<T>(key: string | null): [T | null, (v: T) => void, () => void, boolean] {
  const [value, setValue] = useState<T | null>(null);
  const [restored, setRestored] = useState(false);
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    let cancelled = false;
    setRestored(false);
    setValue(null);
    if (!key) {
      setRestored(true);
      return;
    }
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (!cancelled && raw) setValue(JSON.parse(raw) as T);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setRestored(true));
    return () => {
      cancelled = true;
    };
  }, [key]);

  const save = useCallback((v: T) => {
    setValue(v);
    const k = keyRef.current;
    if (k) AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => undefined);
  }, []);

  const clear = useCallback(() => {
    setValue(null);
    const k = keyRef.current;
    if (k) AsyncStorage.removeItem(k).catch(() => undefined);
  }, []);

  return [value, save, clear, restored];
}
