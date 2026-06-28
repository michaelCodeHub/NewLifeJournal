import { LIGHT_COLORS, DARK_COLORS } from '../../context/ThemeContext';

describe('LIGHT_COLORS', () => {
  it('has the correct brand background', () => {
    expect(LIGHT_COLORS.background).toBe('#E0F2F3');
  });

  it('has the correct primary teal', () => {
    expect(LIGHT_COLORS.primary).toBe('#81bec1');
  });

  it('has white surface', () => {
    expect(LIGHT_COLORS.surface).toBe('#ffffff');
  });

  it('has dark text on light background', () => {
    expect(LIGHT_COLORS.textPrimary).toBe('#1a1a1a');
  });
});

describe('DARK_COLORS', () => {
  it('has a dark background', () => {
    expect(DARK_COLORS.background.toLowerCase()).toMatch(/^#[0-1]/);
  });

  it('keeps the brand primary color unchanged', () => {
    expect(DARK_COLORS.primary).toBe('#81bec1');
  });

  it('has light text for dark background', () => {
    // textPrimary should be a light color (high hex value)
    const hex = DARK_COLORS.textPrimary.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    expect(r).toBeGreaterThan(200);
  });
});

describe('Color token completeness', () => {
  const requiredKeys: (keyof typeof LIGHT_COLORS)[] = [
    'background', 'surface', 'surfaceSecondary',
    'textPrimary', 'textSecondary', 'textMuted',
    'primary', 'primaryLight',
    'orange', 'green', 'red', 'gold',
    'border', 'shadow', 'tabBar', 'tabBarBorder',
  ];

  it('LIGHT_COLORS has all required keys', () => {
    requiredKeys.forEach(key => {
      expect(LIGHT_COLORS[key]).toBeDefined();
      expect(typeof LIGHT_COLORS[key]).toBe('string');
    });
  });

  it('DARK_COLORS has all required keys', () => {
    requiredKeys.forEach(key => {
      expect(DARK_COLORS[key]).toBeDefined();
      expect(typeof DARK_COLORS[key]).toBe('string');
    });
  });

  it('both themes have the same set of keys', () => {
    const lightKeys = Object.keys(LIGHT_COLORS).sort();
    const darkKeys = Object.keys(DARK_COLORS).sort();
    expect(lightKeys).toEqual(darkKeys);
  });

  it('dark mode primary is unchanged from light', () => {
    expect(DARK_COLORS.primary).toBe(LIGHT_COLORS.primary);
  });

  it('dark mode background is different from light', () => {
    expect(DARK_COLORS.background).not.toBe(LIGHT_COLORS.background);
  });
});
