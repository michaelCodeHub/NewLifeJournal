import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The user's privacy choices, kept on the device.
 *
 *  - `analytics`: anonymous usage events (opt-in, off by default).
 *  - `crashReports`: crash and error reports to Crashlytics (opt-in, off by default — PRD 8.2).
 *  - `ai`: they've read how the assistant uses their data (asked once, on first use of Ask).
 *
 * Health details are never sent to analytics regardless of this setting
 * (see analytics.ts); consent only decides whether anonymous events are sent at all.
 */
export interface Consent {
  analytics: boolean;
  crashReports: boolean;
  ai: boolean;
}

const KEY = 'bb.consent.v1';
const DEFAULTS: Consent = { analytics: false, crashReports: false, ai: false };

let state: Consent = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function loadConsent(): Promise<Consent> {
  if (loaded) return state;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) state = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    // Unreadable storage → keep the safe defaults (everything off).
  }
  loaded = true;
  emit();
  return state;
}

export const getConsent = (): Consent => state;
export const isConsentLoaded = () => loaded;

export async function setConsent(patch: Partial<Consent>): Promise<void> {
  state = { ...state, ...patch };
  emit();
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Choice still applies for this session.
  }
}

/** Forget choices (on sign-out / account deletion), back to everything off. */
export async function resetConsent(): Promise<void> {
  state = DEFAULTS;
  emit();
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  if (!loaded) loadConsent();
  return () => {
    listeners.delete(l);
  };
};

/** Live consent state for components. `loaded` is false until storage has been read. */
export function useConsent(): Consent & { loaded: boolean } {
  const snapshot = useSyncExternalStore(subscribe, getConsent, getConsent);
  return { ...snapshot, loaded };
}
