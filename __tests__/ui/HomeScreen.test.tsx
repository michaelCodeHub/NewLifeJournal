import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import PregnancyHomeScreen from '../../app/(pregnancy)/(tabs)/home';
import { ThemeProvider } from '../../context/ThemeContext';

const mockGetCurrentWeek = jest.fn(() => 20);
const mockGetDaysUntilDue = jest.fn(() => 140);

jest.mock('../../context/PregnancyContext', () => ({
  usePregnancy: jest.fn(),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../services/firebase/weekInfoService', () => ({
  getWeekInfo: jest.fn(),
  peekWeekInfo: jest.fn(() => null),
}));

// The modals are covered separately; keep the home render light.
jest.mock('../../components/WeekDetailModal', () => {
  const { View } = require('react-native');
  return () => <View testID="week-detail-modal" />;
});
jest.mock('../../components/GrowthGalleryModal', () => {
  const { View } = require('react-native');
  return () => <View testID="growth-gallery-modal" />;
});

import { usePregnancy } from '../../context/PregnancyContext';
import { useAuth } from '../../context/AuthContext';
import { getWeekInfo } from '../../services/firebase/weekInfoService';

const mockUsePregnancy = usePregnancy as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockGetWeekInfo = getWeekInfo as jest.Mock;

const mockPregnancy = {
  id: 'preg-123',
  motherName: 'Alice Smith',
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
  tips: ['Stay hydrated'],
  dailyTips: [
    { title: 'Stay Hydrated', subtitle: 'Drink 8 glasses of water', icon: '💧', color: '#4A90D9' },
    { title: 'Rest Well', subtitle: 'Get 8 hours of sleep', icon: '😴', color: '#9B59B6' },
  ],
};

const renderHome = async () =>
  await render(
    <ThemeProvider>
      <PregnancyHomeScreen />
    </ThemeProvider>
  );

const withPregnancy = (week = 20, days = 140) =>
  mockUsePregnancy.mockReturnValue({
    hospitalVisits: [],
    symptoms: [],
    milestones: [],
    pregnancy: mockPregnancy,
    loading: false,
    error: null,
    getCurrentWeek: jest.fn(() => week),
    getDaysUntilDue: jest.fn(() => days),
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { uid: 'user-123', displayName: 'Alice', photoURL: null }, loading: false });
  mockGetWeekInfo.mockResolvedValue(mockWeekInfo);
});

describe('PregnancyHomeScreen', () => {
  it('shows a loading indicator while data is being fetched', async () => {
    mockUsePregnancy.mockReturnValue({
    hospitalVisits: [],
    symptoms: [],
    milestones: [],
      pregnancy: null,
      loading: true,
      error: null,
      getCurrentWeek: mockGetCurrentWeek,
      getDaysUntilDue: mockGetDaysUntilDue,
    });
    await renderHome();
    expect(screen.getByTestId('screen-loading')).toBeTruthy();
  });

  it('offers setup when there is no active pregnancy', async () => {
    mockUsePregnancy.mockReturnValue({
    hospitalVisits: [],
    symptoms: [],
    milestones: [],
      pregnancy: null,
      loading: false,
      error: null,
      getCurrentWeek: jest.fn(() => 0),
      getDaysUntilDue: jest.fn(() => 0),
    });
    await renderHome();
    expect(screen.getByText('No active pregnancy')).toBeTruthy();
    expect(screen.getByText('Set up pregnancy')).toBeTruthy();
  });

  it('greets the user by first name and shows the current week', async () => {
    withPregnancy();
    await renderHome();
    expect(screen.getByText(/, Alice/)).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/Week 20/)).toBeTruthy());
  });

  it('shows days to go and the current week', async () => {
    withPregnancy();
    await renderHome();
    expect(screen.getByText(/140 days to go/)).toBeTruthy();
    expect(screen.getByText(/Week 20/)).toBeTruthy();
  });

  it('loads week info for the derived week and shows baby size', async () => {
    withPregnancy();
    await renderHome();
    await waitFor(() => expect(mockGetWeekInfo).toHaveBeenCalledWith(20));
    await waitFor(() => expect(screen.getByText(/banana/i)).toBeTruthy());
    expect(screen.getByText('Baby can hear sounds')).toBeTruthy();
  });

  it.each([
    [8, 224, '1st trimester'],
    [20, 140, '2nd trimester'],
    [32, 56, '3rd trimester'],
  ])('week %i shows %s', async (week, days, label) => {
    withPregnancy(week, days);
    await renderHome();
    await waitFor(() => expect(screen.getAllByText(new RegExp(label as string, 'i')).length).toBeGreaterThan(0));
  });

  it('shows quick-log actions for symptoms and visits', async () => {
    withPregnancy();
    await renderHome();
    expect(screen.getByLabelText('Log symptom')).toBeTruthy();
    expect(screen.getByLabelText('Log visit')).toBeTruthy();
  });
});
