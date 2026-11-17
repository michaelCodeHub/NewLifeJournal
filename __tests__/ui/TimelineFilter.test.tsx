import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import TimelineScreen from '../../app/(pregnancy)/(tabs)/timeline';
import { ThemeProvider } from '../../context/ThemeContext';
import { ToastProvider } from '../../components/ui';
import { trackEvent } from '../../services/monitoring/analytics';

// `timeline_filtered` must only fire when the filter actually changes, never when
// the selected segment is tapped again. Jest renders the iOS SegmentedControl
// (a mocked SwiftUI Picker); the web/Android re-tap rule is covered in
// SegmentedControl.test.tsx.

jest.mock('../../services/monitoring/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('../../context/PregnancyContext', () => ({
  usePregnancy: () => ({
    pregnancy: { id: 'p1', dueDate: { toDate: () => new Date(Date.now() + 100 * 86400000) } },
    hospitalVisits: [],
    symptoms: [],
    milestones: [],
    loading: false,
    deleteHospitalVisit: jest.fn(),
    deleteSymptom: jest.fn(),
    deleteMilestone: jest.fn(),
    getCurrentWeek: () => 25,
  }),
}));
jest.mock('../../components/MilestoneSheet', () => ({ MilestoneSheet: () => null }));

const mockTrack = trackEvent as jest.Mock;
const filterPicker = () => {
  const [picker] = screen.container.queryAll((n) => n.type === 'ExpoUI.Picker');
  if (!picker) throw new Error('timeline filter not rendered');
  return picker;
};

beforeEach(() => mockTrack.mockClear());

it('fires timeline_filtered only when the filter changes', async () => {
  await render(
    <ThemeProvider>
      <ToastProvider>
        <TimelineScreen />
      </ToastProvider>
    </ThemeProvider>
  );

  // Re-tap "All" (already selected): nothing.
  await fireEvent(filterPicker(), 'selectionChange', 0);
  expect(mockTrack).not.toHaveBeenCalled();

  // Switch to "Visits": one event.
  await fireEvent(filterPicker(), 'selectionChange', 1);
  expect(mockTrack).toHaveBeenCalledTimes(1);
  expect(mockTrack).toHaveBeenCalledWith('timeline_filtered', { action: 'visits' });

  // Re-tap "Visits": still one.
  await fireEvent(filterPicker(), 'selectionChange', 1);
  expect(mockTrack).toHaveBeenCalledTimes(1);
});
