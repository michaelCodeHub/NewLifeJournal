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
  primary: string;
  primaryLight: string;
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
  background: '#E0F2F3',
  surface: '#ffffff',
  surfaceSecondary: '#f5f5f5',
  textPrimary: '#1a1a1a',
  textSecondary: '#555555',
  textMuted: '#999999',
  primary: '#81bec1',
  primaryLight: '#b2d8da',
  orange: '#FF9800',
  green: '#4CAF50',
  red: '#F44336',
  gold: '#FFD700',
  border: '#e0e0e0',
  shadow: '#000000',
  tabBar: '#ffffff',
  tabBarBorder: '#e0e0e0',
};

export const DARK_COLORS: ThemeColors = {
  background: '#0f2022',
  surface: '#1a3235',
  surfaceSecondary: '#243d40',
  textPrimary: '#f0f0f0',
  textSecondary: '#c0c0c0',
  textMuted: '#777777',
  primary: '#81bec1',
  primaryLight: '#5a9ea1',
  orange: '#FF9800',
  green: '#66BB6A',
  red: '#EF5350',
  gold: '#FFD54F',
  border: '#2a4a4d',
  shadow: '#000000',
  tabBar: '#1a3235',
  tabBarBorder: '#2a4a4d',
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
