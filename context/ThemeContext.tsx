import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { useColorScheme, Platform, TextStyle, ViewStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Bloom & Bump design system.
 *
 * Direction: "Linear x Plum" — calm, precise, quiet. Cool near-white canvas,
 * white surfaces separated by hairline borders (not heavy shadows), Inter on a
 * strict type scale, soft tinted icon tiles for categories, and the brand teal
 * used sparingly for the things you can act on.
 *
 * Rules:
 *  - Screens never use hex literals. Everything comes from `colors`.
 *  - Text sizes come from `type`, spacing from `space`, corners from `radius`.
 *  - `primary` is the brand tint (illustration, progress, selection). Buttons and
 *    links use `primaryDark` with `onPrimary` text, which keeps AA contrast.
 */

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeColors {
  // Canvas & surfaces
  background: string;       // app canvas
  surface: string;          // sheets, bars, inputs
  card: string;             // content cards: a soft fill that blends into the canvas
  surfaceSecondary: string; // inputs, pressed rows, subtle fills
  surfaceTertiary: string;  // skeletons, tracks
  overlay: string;          // sheet backdrop
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // Brand
  primary: string;          // brand teal: progress, selection, illustration
  primaryLight: string;     // teal tint fill
  primaryDark: string;      // interactive: buttons, links, active tab
  onPrimary: string;        // text/icons on primaryDark
  // Semantic (+ tints for icon tiles and pills)
  green: string;
  greenTint: string;
  orange: string;
  orangeTint: string;
  red: string;
  redTint: string;
  gold: string;
  goldTint: string;
  plum: string;
  plumTint: string;
  blue: string;
  blueTint: string;
  // Lines
  border: string;
  borderStrong: string;
  // Legacy names kept so older screens keep compiling
  shadow: string;
  tabBar: string;
  tabBarBorder: string;
  // Touch feedback (Android ripple): the pressed state layer on surfaces and on filled teal.
  ripple: string;
  rippleOnPrimary: string;
}

export const LIGHT_COLORS: ThemeColors = {
  // Clean white canvas (Plum / Instagram). Cards sit on it with a hairline, not a shadow.
  background: '#FFFFFF',
  surface: '#FFFFFF',
  card: '#F6F8F8',
  surfaceSecondary: '#EFF2F2',
  surfaceTertiary: '#E8ECEC',
  overlay: 'rgba(12, 20, 21, 0.38)',
  textPrimary: '#0F1718',
  textSecondary: '#5A6667',
  textMuted: '#8D989A',
  primary: '#3AA3A9',       // exact logo teal
  primaryLight: '#E7F4F5',
  primaryDark: '#227B81',   // logo teal, deepened for AA button contrast
  onPrimary: '#FFFFFF',
  green: '#2F8F5B',
  greenTint: '#E9F5EE',
  orange: '#C7701F',
  orangeTint: '#FCF0E3',
  red: '#C9433A',
  redTint: '#FBEBE9',
  gold: '#A9831A',
  goldTint: '#FAF3DC',
  plum: '#7457B3',
  plumTint: '#F1EDFA',
  blue: '#3C6FD1',
  blueTint: '#EAF0FC',
  border: '#EAEDED',
  borderStrong: '#D7DDDD',
  shadow: '#0B1F20',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E9E9',
  ripple: 'rgba(15, 23, 24, 0.10)', // textPrimary @ 10%
  rippleOnPrimary: 'rgba(255, 255, 255, 0.20)', // onPrimary @ 20%
};

export const DARK_COLORS: ThemeColors = {
  background: '#0B1011',
  surface: '#121919',
  card: '#131A1B',
  surfaceSecondary: '#192122',
  surfaceTertiary: '#212B2C',
  overlay: 'rgba(0, 0, 0, 0.6)',
  textPrimary: '#ECF1F1',
  textSecondary: '#A1ADAE',
  textMuted: '#6A7677',
  primary: '#3AA3A9',
  primaryLight: '#11292B',
  primaryDark: '#62BEC3',
  onPrimary: '#04191A',
  green: '#6CC38F',
  greenTint: '#13261B',
  orange: '#E9A15B',
  orangeTint: '#2B1E10',
  red: '#EE8378',
  redTint: '#2D1614',
  gold: '#E2C16A',
  goldTint: '#2A2412',
  plum: '#AE97E8',
  plumTint: '#1F1A2E',
  blue: '#8AAEF2',
  blueTint: '#141E31',
  border: '#202A2B',
  borderStrong: '#2D3839',
  shadow: '#000000',
  tabBar: '#121919',
  tabBarBorder: '#202A2B',
  ripple: 'rgba(236, 241, 241, 0.12)', // textPrimary @ 12%
  rippleOnPrimary: 'rgba(4, 25, 26, 0.16)', // onPrimary @ 16%
};

// ---------------------------------------------------------------- typography

/** The logo's background gradient (top-left light to bottom-right deep). */
export const BRAND_GRADIENT = ['#52B5B9', '#3AA3A9', '#2D969C'] as const;

export const FONT = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

const t = (family: string, size: number, lineHeight: number, letterSpacing = 0): TextStyle => ({
  fontFamily: family,
  fontSize: size,
  lineHeight,
  letterSpacing,
});

/** One type scale for the whole app. Use these, never ad-hoc fontSize. */
export const TYPE = {
  // Compact, Linear/Plum-style density: 14px body, 13px secondary.
  display: t(FONT.bold, 28, 34, -0.6),
  largeTitle: t(FONT.bold, 26, 32, -0.6),
  title1: t(FONT.semibold, 22, 28, -0.4),
  title2: t(FONT.semibold, 17, 22, -0.25),
  headline: t(FONT.semibold, 15, 20, -0.1),
  body: t(FONT.regular, 14, 20, -0.08),
  bodyMedium: t(FONT.medium, 14, 20, -0.08),
  callout: t(FONT.regular, 13, 18, -0.04),
  calloutMedium: t(FONT.medium, 13, 18, -0.04),
  footnote: t(FONT.regular, 12, 16),
  caption: t(FONT.medium, 11, 14, 0.05),
  overline: { ...t(FONT.semibold, 11, 14, 0.6), textTransform: 'uppercase' } as TextStyle,
  number: t(FONT.semibold, 26, 30, -0.7),
  // Material 3 roles, set in Inter (used by the Android kit tokens below).
  labelLarge: t(FONT.medium, 14, 20, 0.1),
  titleLarge: t(FONT.regular, 22, 28),
} as const;

export type TypeVariant = keyof typeof TYPE;

// ------------------------------------------------------------ spacing/radius

export const SPACE = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48 } as const;
export const RADIUS = { xs: 6, sm: 8, md: 10, lg: 12, xl: 18, pill: 999 } as const;

/** Control heights (Linear-style density). Touch targets stay >= 44pt via hitSlop. */
export const CONTROL = { input: 36, buttonLg: 42, buttonMd: 36, buttonSm: 28, segment: 30, chip: 28, row: 44 } as const;

/** Screen side gutter. */
export const GUTTER = 20;

/* ---------------------------------------------------- component tokens (kit) */

type Size3 = { lg: number; md: number; sm: number };

/**
 * Shape, size and behaviour tokens for the kit components, per platform.
 * KIT_DEFAULT is the iOS / web look (the values the kit always had — locked by
 * __tests__/ui/kitLook.test.tsx). KIT_ANDROID follows Material 3, in our colours
 * and Inter. Components read them with `kit()`, never hard-code per-platform styles.
 */
export interface KitTokens {
  /** Press feedback: iOS / web scale + dim; Android Material ripple (colors.ripple). */
  touch: 'scale' | 'ripple';
  button: {
    height: Size3;
    radius: Size3;
    paddingX: Size3;
    text: { lg: TypeVariant; md: TypeVariant; sm: TypeVariant };
    iconSize: Size3;
    /** Text colour of the `secondary` (outlined) button. */
    outlinedText: keyof ThemeColors;
    /** Text colour of the `ghost` (text) button. */
    textButtonText: keyof ThemeColors;
  };
  field: {
    height: number;
    radius: number;
    focusedBorderWidth: number;
    multilineMinHeight: number;
    /** Material: hint as supporting text under the field (error replaces it). */
    supportingTextBelow: boolean;
  };
  card: { radius: number; /** How `tone="raised"` lifts: a soft shadow, or a 1dp outline. */ raised: 'shadow' | 'outline' };
  chip: { height: number; radius: number; /** Outline on the selected chip. */ selectedBorder: boolean };
  pill: { radius: number };
  sheet: { radius: number };
  row: { minHeight: number; twoLineMinHeight: number; paddingVertical: number };
  toast: { radius: number; minHeight: number };
  header: {
    barHeight: number;
    barTitle: TypeVariant;
    backIcon: 'chevron-back' | 'arrow-back';
    actionSize: number;
    actionRadius: number;
  };
  tabBar: { height: number; /** Material active indicator (pill behind the icon). */ indicator: boolean };
  empty: { iconSize: number; iconRound: boolean };
}

export const KIT_DEFAULT: KitTokens = {
  touch: 'scale',
  button: {
    height: { lg: CONTROL.buttonLg, md: CONTROL.buttonMd, sm: CONTROL.buttonSm },
    radius: { lg: RADIUS.sm, md: RADIUS.sm, sm: RADIUS.xs },
    paddingX: { lg: SPACE.lg - 2, md: SPACE.lg - 2, sm: SPACE.md - 2 },
    text: { lg: 'bodyMedium', md: 'calloutMedium', sm: 'calloutMedium' },
    iconSize: { lg: 16, md: 14, sm: 14 },
    outlinedText: 'textPrimary',
    textButtonText: 'textSecondary',
  },
  field: { height: CONTROL.input, radius: RADIUS.sm, focusedBorderWidth: 1, multilineMinHeight: 76, supportingTextBelow: false },
  card: { radius: RADIUS.lg, raised: 'shadow' },
  chip: { height: CONTROL.chip, radius: RADIUS.pill, selectedBorder: true },
  pill: { radius: RADIUS.pill },
  sheet: { radius: RADIUS.xl },
  row: { minHeight: CONTROL.row, twoLineMinHeight: CONTROL.row, paddingVertical: 10 },
  toast: { radius: RADIUS.pill, minHeight: 0 },
  header: { barHeight: 52, barTitle: 'title2', backIcon: 'chevron-back', actionSize: 32, actionRadius: RADIUS.sm },
  tabBar: { height: 52, indicator: false },
  empty: { iconSize: 52, iconRound: false },
};

export const KIT_ANDROID: KitTokens = {
  touch: 'ripple',
  button: {
    // M3 common buttons: 40dp, fully rounded, labelLarge; the small size is M3's 32dp (XS).
    height: { lg: 40, md: 40, sm: 32 },
    radius: { lg: RADIUS.pill, md: RADIUS.pill, sm: RADIUS.pill },
    paddingX: { lg: 24, md: 24, sm: 12 },
    text: { lg: 'labelLarge', md: 'labelLarge', sm: 'labelLarge' },
    // M3 asks for 18dp; the kit's icon sizes are 16 / 20 / 22 (Icon snaps), so 16.
    iconSize: { lg: 16, md: 16, sm: 16 },
    outlinedText: 'primaryDark',
    textButtonText: 'primaryDark',
  },
  // M3 outlined text field: 56dp, 4dp corners, 2dp outline when focused.
  field: { height: 56, radius: 4, focusedBorderWidth: 2, multilineMinHeight: 96, supportingTextBelow: true },
  card: { radius: 12, raised: 'outline' },
  chip: { height: 32, radius: 8, selectedBorder: false },
  pill: { radius: 8 },
  sheet: { radius: 28 },
  // M3 list items: 56dp one-line, 72dp two-line.
  row: { minHeight: 56, twoLineMinHeight: 72, paddingVertical: 8 },
  // M3 snackbar: 4dp corners, 48dp min height.
  toast: { radius: 4, minHeight: 48 },
  // M3 small top app bar: 64dp, titleLarge, arrow back, 40dp round icon buttons.
  header: { barHeight: 64, barTitle: 'titleLarge', backIcon: 'arrow-back', actionSize: 40, actionRadius: 20 },
  // M3 navigation bar: 80dp with an active indicator.
  tabBar: { height: 80, indicator: true },
  empty: { iconSize: 64, iconRound: true },
};

/** The kit tokens for this platform (read at render time). */
export const kit = (): KitTokens => (Platform.OS === 'android' ? KIT_ANDROID : KIT_DEFAULT);

/** Very soft elevation, Linear-style: mostly the border does the work. */
export const elevation = (isDark: boolean, level: 0 | 1 | 2 = 1): ViewStyle => {
  if (isDark || level === 0) return {};
  // Platform.OS is read at call time (like kit()), so each platform's look is testable.
  if (Platform.OS === 'ios') {
    return {
      shadowColor: LIGHT_COLORS.shadow,
      shadowOpacity: level === 1 ? 0.06 : 0.12,
      shadowRadius: level === 1 ? 10 : 20,
      shadowOffset: { width: 0, height: level === 1 ? 2 : 8 },
    };
  }
  if (Platform.OS === 'android') {
    // Material 3 prefers tonal surfaces: no shadow for level 1 (the border / fill does it),
    // a small one for floating things (toast, level 2).
    return level === 1 ? {} : { elevation: 3, shadowColor: LIGHT_COLORS.shadow };
  }
  // react-native-web
  return {
    boxShadow:
      level === 1
        ? '0 1px 2px rgba(11,31,32,0.04), 0 2px 10px rgba(11,31,32,0.05)'
        : '0 10px 28px rgba(11,31,32,0.12)',
  } as ViewStyle;
};

// ------------------------------------------------------------------- context

export interface Theme {
  colors: ThemeColors;
  type: typeof TYPE;
  space: typeof SPACE;
  radius: typeof RADIUS;
  isDark: boolean;
}

const THEME_STORAGE_KEY = 'app_theme_mode';

interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  colors: ThemeColors;
  theme: Theme;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  /** False until the saved appearance has been read, so the first frame never shows the wrong theme. */
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeModeState(saved);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
  }, []);

  const resolvedTheme: ResolvedTheme =
    themeMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themeMode;
  const isDark = resolvedTheme === 'dark';

  const value = useMemo<ThemeContextType>(() => {
    const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
    return {
      themeMode,
      resolvedTheme,
      colors,
      theme: { colors, type: TYPE, space: SPACE, radius: RADIUS, isDark },
      setThemeMode,
      isDark,
      ready,
    };
  }, [themeMode, resolvedTheme, isDark, setThemeMode, ready]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

/**
 * Build a StyleSheet from the theme once per theme change (not every render).
 *   const styles = useThemedStyles(makeStyles);
 *   const makeStyles = ({ colors, space }: Theme) => StyleSheet.create({...});
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const { theme } = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
