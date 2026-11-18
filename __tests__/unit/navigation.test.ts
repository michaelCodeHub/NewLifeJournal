import { Platform } from 'react-native';
import { TAB_FADE_MS, pushAnimation, tabTransition } from '../../constants/navigation';

const as = (os: string, fn: () => void) => {
  const r = jest.replaceProperty(Platform, 'OS', os as never);
  try {
    fn();
  } finally {
    r.restore();
  }
};

describe('screen transitions', () => {
  it('pushed screens: native push on iOS, the eased parallax slide on Android', () => {
    as('ios', () => expect(pushAnimation()).toBe('slide_from_right'));
    as('android', () => expect(pushAnimation()).toBe('ios_from_right'));
  });

  it('tabs cross-fade quickly on iOS and Android', () => {
    for (const os of ['ios', 'android']) {
      as(os, () => {
        const t = tabTransition() as { animation: string; transitionSpec?: { config: { duration: number } } };
        expect(t.animation).toBe('fade');
        expect(t.transitionSpec?.config.duration).toBe(TAB_FADE_MS);
        expect(TAB_FADE_MS).toBeLessThanOrEqual(200);
      });
    }
  });

  it('web keeps the instant tab switch it had', () => {
    as('web', () => expect(tabTransition()).toEqual({ animation: 'none' }));
  });
});
