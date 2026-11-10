import { LIGHT_COLORS, DARK_COLORS, TYPE, ThemeColors } from '../../context/ThemeContext';

// WCAG relative luminance / contrast ratio.
const luminance = (hex: string) => {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const themes: [string, ThemeColors][] = [
  ['light', LIGHT_COLORS],
  ['dark', DARK_COLORS],
];

describe('brand', () => {
  it('uses the exact logo teal as the brand primary in both themes', () => {
    expect(LIGHT_COLORS.primary.toLowerCase()).toBe('#3aa3a9');
    expect(DARK_COLORS.primary).toBe(LIGHT_COLORS.primary);
  });

  it('uses a white surface in light mode and a dark canvas in dark mode', () => {
    expect(LIGHT_COLORS.surface.toLowerCase()).toBe('#ffffff');
    expect(luminance(DARK_COLORS.background)).toBeLessThan(0.02);
  });
});

describe('token completeness', () => {
  it('both themes define exactly the same tokens', () => {
    expect(Object.keys(LIGHT_COLORS).sort()).toEqual(Object.keys(DARK_COLORS).sort());
  });

  it('every token is a non-empty string', () => {
    for (const [, c] of themes) {
      for (const v of Object.values(c)) expect(typeof v === 'string' && v.length > 0).toBe(true);
    }
  });
});

describe.each(themes)('%s theme contrast (WCAG AA)', (_name, c) => {
  it('primary text on canvas and surface is >= 7:1', () => {
    expect(contrast(c.textPrimary, c.background)).toBeGreaterThanOrEqual(7);
    expect(contrast(c.textPrimary, c.surface)).toBeGreaterThanOrEqual(7);
  });

  it('secondary text on surface is >= 4.5:1', () => {
    expect(contrast(c.textSecondary, c.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('button label on primaryDark is >= 4.5:1', () => {
    expect(contrast(c.onPrimary, c.primaryDark)).toBeGreaterThanOrEqual(4.5);
  });

  it('semantic colors are readable on their own tints (>= 3:1 for small UI text)', () => {
    for (const [fg, bg] of [
      [c.green, c.greenTint],
      [c.orange, c.orangeTint],
      [c.red, c.redTint],
      [c.plum, c.plumTint],
      [c.primaryDark, c.primaryLight],
    ]) {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('type scale', () => {
  it('every step uses an Inter face and a line height larger than the size', () => {
    for (const step of Object.values(TYPE)) {
      expect(String(step.fontFamily)).toMatch(/^Inter_/);
      expect(step.lineHeight!).toBeGreaterThan(step.fontSize!);
    }
  });
});
