import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * App Store / Play rating prompt (PRD 10.1): asked once, at a good moment —
 * right after the person logs something, at least 3 days after their first
 * log. The OS decides whether the dialog actually shows (and rate-limits it).
 */
const FIRST_LOG_KEY = 'review:firstLogAt';
const ASKED_KEY = 'review:asked';
export const REVIEW_DELAY_DAYS = 3;
const DAY = 24 * 60 * 60 * 1000;

/** Lazy so web / tests never load the native module. */
const getStoreReview = () => require('expo-store-review') as typeof import('expo-store-review');

/** Pure rule, exported for tests. */
export const shouldAskForReview = (firstLogAt: number | null, asked: boolean, now = Date.now()) =>
  !asked && firstLogAt !== null && now - firstLogAt >= REVIEW_DELAY_DAYS * DAY;

/** Call after any successful log (visit, symptom, milestone, feed, diaper…). Never throws. */
export async function recordLogForReview(now = Date.now()): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const [first, asked] = await Promise.all([AsyncStorage.getItem(FIRST_LOG_KEY), AsyncStorage.getItem(ASKED_KEY)]);
    if (!first) {
      await AsyncStorage.setItem(FIRST_LOG_KEY, String(now));
      return;
    }
    if (!shouldAskForReview(Number(first), asked === '1', now)) return;
    const StoreReview = getStoreReview();
    if (!(await StoreReview.isAvailableAsync())) return;
    await AsyncStorage.setItem(ASKED_KEY, '1');
    await StoreReview.requestReview();
  } catch {
    // Rating prompts are best effort.
  }
}
