import { Easing, Platform } from 'react-native';

/**
 * Screen transitions, in one place so every navigator moves the same way.
 * Read at render time (Platform.OS), so tests can check each platform.
 *
 * - Pushed screens: iOS keeps its native push. Android's plain `slide_from_right`
 *   looks stiff, so it uses `ios_from_right` — the eased slide with a parallax
 *   under-layer, the smoothest push react-native-screens has on Android.
 * - Tabs: a short cross-fade on iOS / Android instead of a hard cut. Web keeps
 *   the instant switch it had.
 */
export type PushAnimation = 'slide_from_right' | 'ios_from_right';

export const pushAnimation = (): PushAnimation => (Platform.OS === 'android' ? 'ios_from_right' : 'slide_from_right');

/** Cross-fade between tabs: quick, eased out, so it never feels slow. */
export const TAB_FADE_MS = 180;

export const tabTransition = () =>
  Platform.OS === 'web'
    ? ({ animation: 'none' } as const)
    : ({
        animation: 'fade',
        transitionSpec: {
          animation: 'timing',
          config: { duration: TAB_FADE_MS, easing: Easing.out(Easing.cubic) },
        },
      } as const);
