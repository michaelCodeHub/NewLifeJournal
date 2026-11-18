import { Platform } from 'react-native';
import { DARK_COLORS, KIT_ANDROID, KIT_DEFAULT, LIGHT_COLORS, TYPE, kit } from '../../context/ThemeContext';

describe('kit tokens', () => {
  it('iOS / web keep the values the kit always had', () => {
    expect(KIT_DEFAULT.button.height).toEqual({ lg: 42, md: 36, sm: 28 });
    expect(KIT_DEFAULT.button.radius).toEqual({ lg: 8, md: 8, sm: 6 });
    expect(KIT_DEFAULT.field).toMatchObject({ height: 36, radius: 8, focusedBorderWidth: 1, multilineMinHeight: 76 });
    expect(KIT_DEFAULT.card).toEqual({ radius: 12, raised: 'shadow' });
    expect(KIT_DEFAULT.chip).toEqual({ height: 28, radius: 999, selectedBorder: true });
    expect(KIT_DEFAULT.sheet.radius).toBe(18);
    expect(KIT_DEFAULT.row).toEqual({ minHeight: 44, twoLineMinHeight: 44, paddingVertical: 10 });
    expect(KIT_DEFAULT.header).toMatchObject({ barHeight: 52, backIcon: 'chevron-back', actionSize: 32 });
    expect(KIT_DEFAULT.tabBar).toEqual({ height: 52, indicator: false });
    expect(KIT_DEFAULT.touch).toBe('scale');
  });

  it('Android follows Material 3', () => {
    expect(KIT_ANDROID.touch).toBe('scale'); // no ripple (not wanted)
    expect(KIT_ANDROID.button.touchTarget).toBe(48);
    expect(KIT_DEFAULT.button.touchTarget).toBe(0);
    expect(KIT_ANDROID.button.height.md).toBe(40);
    expect(KIT_ANDROID.button.radius.md).toBeGreaterThanOrEqual(KIT_ANDROID.button.height.md / 2); // pill
    expect(KIT_ANDROID.button.text.md).toBe('labelLarge');
    expect(KIT_ANDROID.button.iconSize).toEqual({ lg: 18, md: 18, sm: 18 });
    expect(KIT_DEFAULT.button.iconSize).toEqual({ lg: 16, md: 14, sm: 14 }); // iOS / web: 14 snaps to 16
    expect(KIT_ANDROID.field).toMatchObject({ height: 56, radius: 4, focusedBorderWidth: 2, supportingTextBelow: true });
    expect(KIT_ANDROID.card.radius).toBe(12);
    expect(KIT_ANDROID.chip).toMatchObject({ height: 32, radius: 8 });
    expect(KIT_ANDROID.sheet.radius).toBe(28);
    expect(KIT_ANDROID.row).toMatchObject({ minHeight: 56, twoLineMinHeight: 72 });
    expect(KIT_ANDROID.tabBar.height).toBe(80);
  });

  it('keeps Inter for the Material 3 type roles', () => {
    expect(TYPE.labelLarge).toMatchObject({ fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20 });
    expect(TYPE.titleLarge).toMatchObject({ fontFamily: 'Inter_400Regular', fontSize: 22, lineHeight: 28 });
  });

  it('kit() picks by platform at render time', () => {
    expect(kit()).toBe(KIT_DEFAULT);
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    expect(kit()).toBe(KIT_ANDROID);
    restore.restore();
    const web = jest.replaceProperty(Platform, 'OS', 'web');
    expect(kit()).toBe(KIT_DEFAULT); // web keeps the original look
    web.restore();
  });

  it('ripple colours are translucent tokens in both themes', () => {
    for (const c of [LIGHT_COLORS, DARK_COLORS]) {
      expect(c.ripple).toMatch(/^rgba\(.+, 0\.\d+\)$/);
      expect(c.rippleOnPrimary).toMatch(/^rgba\(.+, 0\.\d+\)$/);
    }
  });
});

describe('icon sizes', () => {
  const { snap, containerIconSize, ICON_SIZE } = require('../../components/ui/Icon') as typeof import('../../components/ui/Icon');
  it('18 is an allowed size, reached only on request', () => {
    expect(ICON_SIZE).toEqual({ sm: 16, button: 18, md: 20, lg: 22 });
    expect([14, 16, 17, 18, 19, 20, 21, 24].map(snap)).toEqual([16, 16, 16, 18, 20, 20, 22, 22]);
  });
  it('sizes computed from containers keep the old 16 / 20 / 22 steps (no surprise 18s)', () => {
    expect([14, 17, 18, 19, 20, 21, 26].map(containerIconSize)).toEqual([16, 16, 20, 20, 20, 22, 22]);
  });
});

describe('elevation()', () => {
  const { elevation } = require('../../context/ThemeContext') as typeof import('../../context/ThemeContext');
  const as = (os: string, fn: () => void) => {
    const r = jest.replaceProperty(Platform, 'OS', os as never);
    try {
      fn();
    } finally {
      r.restore();
    }
  };

  it('iOS and web shadows are unchanged', () => {
    as('ios', () => {
      expect(elevation(false, 1)).toEqual({ shadowColor: LIGHT_COLORS.shadow, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } });
      expect(elevation(false, 2)).toEqual({ shadowColor: LIGHT_COLORS.shadow, shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } });
    });
    as('web', () => {
      expect(elevation(false, 1)).toEqual({ boxShadow: '0 1px 2px rgba(11,31,32,0.04), 0 2px 10px rgba(11,31,32,0.05)' });
      expect(elevation(false, 2)).toEqual({ boxShadow: '0 10px 28px rgba(11,31,32,0.12)' });
    });
  });

  it('Android is tonal: no shadow at level 1, a 3dp one at level 2', () => {
    as('android', () => {
      expect(elevation(false, 1)).toEqual({});
      expect(elevation(false, 2)).toEqual({ elevation: 3, shadowColor: LIGHT_COLORS.shadow });
    });
  });

  it('never in dark mode or at level 0', () => {
    for (const os of ['ios', 'android', 'web']) as(os, () => {
      expect(elevation(true, 2)).toEqual({});
      expect(elevation(false, 0)).toEqual({});
    });
  });
});
