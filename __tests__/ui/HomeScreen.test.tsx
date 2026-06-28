import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import PregnancyHomeScreen from '../../app/(pregnancy)/home';

// Mock the contexts
const mockGetCurrentWeek = jest.fn(() => 20);
const mockGetDaysUntilDue = jest.fn(() => 140);

jest.mock('../../context/PregnancyContext', () => ({
  usePregnancy: jest.fn(),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock ThemeContext so home screen tests don't require ThemeProvider
jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#E0F2F3', surface: '#ffffff', surfaceSecondary: '#f5f5f5',
      textPrimary: '#1a1a1a', textSecondary: '#555555', textMuted: '#999999',
      primary: '#81bec1', primaryLight: '#b2d8da',
      orange: '#FF9800', green: '#4CAF50', red: '#F44336', gold: '#FFD700',
      border: '#e0e0e0', shadow: '#000000', tabBar: '#ffffff', tabBarBorder: '#e0e0e0',
    },
    isDark: false,
    themeMode: 'system',
    resolvedTheme: 'light',
    setThemeMode: jest.fn(),
  }),
  ThemeProvider: ({ children }: any) => children,
  LIGHT_COLORS: {},
  DARK_COLORS: {},
}));

// Mock weekInfoService
jest.mock('../../services/firebase/weekInfoService', () => ({
  getWeekInfo: jest.fn(),
  getWeekImageUrl: jest.fn(),
}));

// Mock WeekDetailModal
jest.mock('../../components/WeekDetailModal', () => {
  const { View } = require('react-native');
  return () => <View testID="week-detail-modal" />;
});

// Mock expo-linear-gradient if used
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: ({ children }: any) => <View>{children}</View> };
});

import { usePregnancy } from '../../context/PregnancyContext';
import { useAuth } from '../../context/AuthContext';
import { getWeekInfo, getWeekImageUrl } from '../../services/firebase/weekInfoService';

const mockUsePregnancy = usePregnancy as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockGetWeekInfo = getWeekInfo as jest.Mock;
const mockGetWeekImageUrl = getWeekImageUrl as jest.Mock;

const mockUser = {
  uid: 'user-123',
  displayName: 'Alice',
  photoURL: null,
};

const mockPregnancy = {
  id: 'preg-123',
  userId: 'user-123',
  motherName: 'Alice',
  dueDate: { toDate: () => new Date(Date.now() + 140 * 24 * 60 * 60 * 1000) },
  currentWeek: 20,
  status: 'active',
};

const mockWeekInfo = {
  week: 20,
  babySize: 'banana',
  babyLength: '25.6 cm',
  babyWeight: '300 g',
  babyDevelopment: ['Baby can hear sounds', 'Movements are stronger'],
  motherChanges: ['Baby bump is more visible'],
  tips: ['Stay hydrated', 'Prenatal yoga is beneficial'],
  dailyTips: [
    { title: 'Hydration', subtitle: 'Drink 8 glasses of water', icon: '💧', color: '#4A90D9' },
    { title: 'Rest', subtitle: 'Get 8 hours of sleep', icon: '😴', color: '#9B59B6' },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
  mockGetWeekInfo.mockResolvedValue(mockWeekInfo);
  mockGetWeekImageUrl.mockResolvedValue(null);
});

describe('PregnancyHomeScreen', () => {
  describe('Loading state', () => {
    it('shows a loading indicator while data is being fetched', () => {
      mockUsePregnancy.mockReturnValue({
        pregnancy: null,
        loading: true,
        getCurrentWeek: mockGetCurrentWeek,
        getDaysUntilDue: mockGetDaysUntilDue,
      });

      render(<PregnancyHomeScreen />);

      expect(screen.UNSAFE_getByType(require('react-native').ActivityIndicator)).toBeTruthy();
    });
  });

  describe('No pregnancy state', () => {
    it('shows "No Pregnancy Found" when there is no active pregnancy', () => {
      mockUsePregnancy.mockReturnValue({
        pregnancy: null,
        loading: false,
        getCurrentWeek: jest.fn(() => 0),
        getDaysUntilDue: jest.fn(() => 0),
      });

      render(<PregnancyHomeScreen />);

      expect(screen.getByText('No Pregnancy Found')).toBeTruthy();
      expect(screen.getByText('Please create a pregnancy profile')).toBeTruthy();
    });
  });

  describe('With active pregnancy', () => {
    beforeEach(() => {
      mockUsePregnancy.mockReturnValue({
        pregnancy: mockPregnancy,
        loading: false,
        getCurrentWeek: mockGetCurrentWeek,
        getDaysUntilDue: mockGetDaysUntilDue,
        hospitalVisits: [],
        symptoms: [],
        milestones: [],
      });
    });

    it('displays the current pregnancy week', async () => {
      render(<PregnancyHomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Week 20/i)).toBeTruthy();
      });
    });

    it('displays the correct trimester label', async () => {
      render(<PregnancyHomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/2nd Trimester/i)).toBeTruthy();
      });
    });

    it('shows a countdown to the due date in weeks', async () => {
      render(<PregnancyHomeScreen />);

      // getDaysUntilDue returns 140 days → Math.ceil(140/7) = 20 weeks shown on screen
      await waitFor(() => {
        expect(screen.getByText(/20 weeks/i)).toBeTruthy();
      });
    });

    it('loads and displays week info after fetching', async () => {
      render(<PregnancyHomeScreen />);

      await waitFor(() => {
        expect(mockGetWeekInfo).toHaveBeenCalledWith(20);
        expect(mockGetWeekImageUrl).toHaveBeenCalledWith(20);
      });
    });

    it('displays baby size information from weekInfo', async () => {
      render(<PregnancyHomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/banana/i)).toBeTruthy();
      });
    });
  });

  describe('Trimester calculation', () => {
    it('shows 1st Trimester for week 1-13', async () => {
      mockUsePregnancy.mockReturnValue({
        pregnancy: mockPregnancy,
        loading: false,
        getCurrentWeek: jest.fn(() => 8),
        getDaysUntilDue: jest.fn(() => 224),
      });

      render(<PregnancyHomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/1st Trimester/i)).toBeTruthy();
      });
    });

    it('shows 3rd Trimester for week 27+', async () => {
      mockUsePregnancy.mockReturnValue({
        pregnancy: mockPregnancy,
        loading: false,
        getCurrentWeek: jest.fn(() => 32),
        getDaysUntilDue: jest.fn(() => 56),
      });

      render(<PregnancyHomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/3rd Trimester/i)).toBeTruthy();
      });
    });
  });
});
