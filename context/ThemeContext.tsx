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
} as const;

export type TypeVariant = keyof typeof TYPE;

// ------------------------------------------------------------ spacing/radius

export const SPACE = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48 } as const;
export const RADIUS = { xs: 6, sm: 8, md: 10, lg: 12, xl: 18, pill: 999 } as const;

/** Control heights (Linear-style density). Touch targets stay >= 44pt via hitSlop. */
export const CONTROL = { input: 36, buttonLg: 42, buttonMd: 36, buttonSm: 28, segment: 30, chip: 28, row: 44 } as const;

/** Screen side gutter. */
export const GUTTER = 20;

/** Very soft elevation, Linear-style: mostly the border does the work. */
export const elevation = (isDark: boolean, level: 0 | 1 | 2 = 1): ViewStyle => {
  if (isDark || level === 0) return {};
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: LIGHT_COLORS.shadow,
      shadowOpacity: level === 1 ? 0.06 : 0.12,
      shadowRadius: level === 1 ? 10 : 20,
      shadowOffset: { width: 0, height: level === 1 ? 2 : 8 },
    },
    android: { elevation: level === 1 ? 1 : 6, shadowColor: LIGHT_COLORS.shadow },
    default: {
      // react-native-web
      boxShadow:
        level === 1
          ? '0 1px 2px rgba(11,31,32,0.04), 0 2px 10px rgba(11,31,32,0.05)'
          : '0 10px 28px rgba(11,31,32,0.12)',
    } as ViewStyle,
  })!;
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
