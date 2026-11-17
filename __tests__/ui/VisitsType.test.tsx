import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import VisitsScreen from '../../app/(pregnancy)/visits';
import { ThemeProvider } from '../../context/ThemeContext';
import { VISIT_TYPES } from '../../lib/journal';

/**
 * Visits → Type uses SelectMenu (9 options → a native menu on iOS / Android).
 * Same accessibility label ("Type: <value>"), selected state and onSelect behaviour as
 * the old SelectField + OptionSheet. Jest renders the iOS menu.
 */

const mockAdd = jest.fn(async () => {});
jest.mock('../../context/PregnancyContext', () => ({
  usePregnancy: () => ({
    pregnancy: { id: 'p1', dueDate: { toDate: () => new Date(Date.now() + 100 * 86400000) } },
    hospitalVisits: [],
    loading: false,
    addHospitalVisit: mockAdd,
    updateHospitalVisit: jest.fn(),
    deleteHospitalVisit: jest.fn(),
  }),
}));
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'u1' } }) }));

const typeMenu = () => {
  const menus = screen.container.queryAll((n) => n.type === 'ExpoUI.Menu');
  const menu = menus.find((m) => String(m.props.modifiers?.[0]?.args?.[0]).startsWith('Type:'));
  if (!menu) throw new Error('no Type menu');
  return menu;
};
const spokenLabel = () => typeMenu().props.modifiers[0].args[0];
const items = () => screen.container.queryAll((n) => n.type === 'ExpoUI.Toggle');
const item = (label: string) => items().find((t) => t.props.label === label)!;

beforeEach(async () => {
  await AsyncStorage.clear();
  mockAdd.mockClear();
  (useLocalSearchParams as jest.Mock).mockReturnValue({ add: '1' }); // open the add form
});
afterEach(() => (useLocalSearchParams as jest.Mock).mockReturnValue({}));

async function renderVisits() {
  await render(
    // No ToastProvider: useToast() is a no-op outside one (no 2.4 s toast timer left running).
    <ThemeProvider>
      <VisitsScreen />
    </ThemeProvider>
  );
  await waitFor(() => expect(typeMenu()).toBeTruthy());
}

it('offers all 9 visit types in a native menu with the same label and selected state', async () => {
  await renderVisits();
  expect(spokenLabel()).toBe('Type: Checkup');
  expect(items().map((t) => t.props.label)).toEqual(VISIT_TYPES.map((t) => t.label));
  expect(items().filter((t) => t.props.isOn).map((t) => t.props.label)).toEqual(['Checkup']);
});

it('choosing a type updates the field and is saved with the visit', async () => {
  await renderVisits();
  await fireEvent(item('Ultrasound'), 'isOnChange', true);
  expect(spokenLabel()).toBe('Type: Ultrasound');
  expect(item('Ultrasound').props.isOn).toBe(true);
  expect(item('Checkup').props.isOn).toBe(false);

  await fireEvent.press(screen.getByText('Save visit'));
  await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
  expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ type: 'ultrasound', label: 'Ultrasound' }));
});

it('"Other" still asks to describe the visit, and re-choosing the selected type keeps it', async () => {
  await renderVisits();
  await fireEvent(item('Other'), 'isOnChange', true);
  expect(screen.getByText('Describe the visit')).toBeOnTheScreen();
  await fireEvent(item('Other'), 'isOnChange', false); // tapping the checked item again
  expect(spokenLabel()).toBe('Type: Other');
  expect(screen.getByText('Describe the visit')).toBeOnTheScreen();
});

it('a type error clears when a type is chosen', async () => {
  await renderVisits();
  await fireEvent(item('Other'), 'isOnChange', true);
  await fireEvent.press(screen.getByText('Save visit')); // "Other" with no description
  expect(await screen.findByText('Describe the visit type')).toBeOnTheScreen();
  expect(mockAdd).not.toHaveBeenCalled();
  await fireEvent(item('Blood test'), 'isOnChange', true);
  expect(screen.queryByText('Describe the visit type')).toBeNull();
});
