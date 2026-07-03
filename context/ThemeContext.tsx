import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeColors {
  // Backgrounds
  background: string;
  surface: string;
  surfaceSecondary: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // Brand
  primary: string;       // brand accent — icons, active states, fills
  primaryLight: string;  // soft fills, chips, selected backgrounds
  primaryDark: string;   // interactive — button backgrounds, links (AA contrast w/ white)
  // Status
  orange: string;
  green: string;
  red: string;
  gold: string;
  // UI
  border: string;
  shadow: string;
  tabBar: string;
  tabBarBorder: string;
}

export const LIGHT_COLORS: ThemeColors = {
  background: '#E8F4F5',
  surface: '#ffffff',
  surfaceSecondary: '#EFF5F5',
  textPrimary: '#152728',
  textSecondary: '#556364',
  textMuted: '#8CA0A1',
  primary: '#81bec1',
  primaryLight: '#CDE6E7',
  primaryDark: '#3F8487',
  orange: '#E39B4D',
  green: '#6FA378',
  red: '#DE6B58',
  gold: '#E3BF63',
  border: '#DCE8E8',
  shadow: '#000000',
  tabBar: '#ffffff',
  tabBarBorder: '#DCE8E8',
};

export const DARK_COLORS: ThemeColors = {
  background: '#0F2022',
  surface: '#16292B',
  surfaceSecondary: '#20393C',
  textPrimary: '#EAF2F2',
  textSecondary: '#B4C3C4',
  textMuted: '#6E8384',
  primary: '#81bec1',
  primaryLight: '#2C4C4F',
  primaryDark: '#5AA6A9',
  orange: '#E3A863',
  green: '#7FB489',
  red: '#E38471',
  gold: '#E3C878',
  border: '#2A4A4D',
  shadow: '#000000',
  tabBar: '#16292B',
  tabBarBorder: '#2A4A4D',
};

const THEME_STORAGE_KEY = 'app_theme_mode';

interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeModeState(saved);
      }
    });
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  };

  const resolvedTheme: ResolvedTheme =
    themeMode === 'system'
      ? (systemScheme === 'dark' ? 'dark' : 'light')
      : themeMode;

  const colors = resolvedTheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{
      themeMode,
      resolvedTheme,
      colors,
      setThemeMode,
      isDark: resolvedTheme === 'dark',
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
