import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { getCalendars } from 'expo-localization';
import { DARK_COLORS, LIGHT_COLORS, ThemeProvider } from '../../context/ThemeContext';
import type { DateTimeFieldProps } from '../../components/ui/DateTimeField.types';

type Field = React.FC<DateTimeFieldProps>;
const { DateTimeField: IOSField } = require('../../components/ui/DateTimeField.ios.tsx') as { DateTimeField: Field };
const AndroidModule = require('../../components/ui/DateTimeField.android.tsx') as {
  DateTimeField: Field;
  deviceUses24HourClock: () => boolean;
};
const AndroidField = AndroidModule.DateTimeField;
const { DateTimeField: WebField } = require('../../components/ui/DateTimeField.tsx') as { DateTimeField: Field };
// The public import path must keep exporting formatDateTime on every platform.
const kit = require('../../components/ui') as { formatDateTime: (d: Date, now?: Date) => string };

type Scheme = 'light' | 'dark';
let mockPhoneScheme: Scheme = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: () => mockPhoneScheme }));

async function renderThemed(ui: React.ReactElement, { phone = 'light', app = 'system' }: { phone?: Scheme; app?: Scheme | 'system' } = {}) {
  mockPhoneScheme = phone;
  await AsyncStorage.setItem('app_theme_mode', app);
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}
const hosts = (type: string) => screen.container.queryAll((n) => n.type === `ExpoUI.${type}`);
const hostOf = (type: string) => {
  const [node] = hosts(type);
  if (!node) throw new Error(`No ExpoUI.${type} rendered`);
  return node;
};
const press = (label: string) => fireEvent.press(screen.getByLabelText(new RegExp(`^${label}:`)));

const mockCalendars = getCalendars as jest.Mock;
const VALUE = new Date(2026, 10, 17, 9, 15); // an exact instant
const MAX = new Date(2026, 10, 17, 9, 30);
const MIN = new Date(2026, 10, 10, 6, 0);

beforeEach(async () => {
  mockPhoneScheme = 'light';
  await AsyncStorage.clear();
  mockCalendars.mockReturnValue([{ calendar: 'gregory', timeZone: 'UTC', uses24hourClock: false, firstWeekday: 1 }]);
});

it('formatDateTime is still exported from the kit', () => {
  expect(kit.formatDateTime(new Date(2026, 10, 17, 9, 5), new Date(2026, 10, 17, 20))).toMatch(/^Today, /);
});

describe('DateTimeField (iOS, SwiftUI date + time picker)', () => {
  it('shows the native picker with date and time, limited to the exact min/max instants', async () => {
    await renderThemed(<IOSField label="Started" value={VALUE} onChange={jest.fn()} minimumDate={MIN} maximumDate={MAX} />);
    await press('Started');
    const picker = hostOf('DatePicker');
    expect(picker.props.selection).toEqual(VALUE);
    expect(picker.props.displayedComponents).toEqual(['date', 'hourAndMinute']);
    expect(picker.props.range).toEqual({ start: MIN, end: MAX });
    expect(picker.props.modifiers[1]).toEqual({ $type: 'tint', args: [LIGHT_COLORS.primaryDark] });
  });

  it('Done commits the picked instant; a time past the max is clamped to it', async () => {
    const onChange = jest.fn();
    await renderThemed(<IOSField label="Started" value={VALUE} onChange={onChange} maximumDate={MAX} />);
    await press('Started');
    await fireEvent(hostOf('DatePicker'), 'dateChange', new Date(2026, 10, 17, 8, 40));
    await fireEvent.press(screen.getByText('Done'));
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 10, 17, 8, 40));

    await press('Started');
    await fireEvent(hostOf('DatePicker'), 'dateChange', new Date(2026, 10, 17, 11, 0));
    await fireEvent.press(screen.getByText('Done'));
    expect(onChange).toHaveBeenLastCalledWith(MAX);
  });

  it('quick chips still work and respect the max', async () => {
    const onChange = jest.fn();
    const past = new Date(Date.now() - 3 * 3600 * 1000);
    await renderThemed(<IOSField label="Started" value={past} onChange={onChange} maximumDate={past} />);
    await press('Started');
    await fireEvent.press(screen.getByText('Now'));
    await fireEvent.press(screen.getByText('Done'));
    expect(onChange).toHaveBeenCalledWith(past);
  });

  it('closing the sheet without Done changes nothing', async () => {
    const onChange = jest.fn();
    await renderThemed(<IOSField label="Started" value={VALUE} onChange={onChange} />);
    await press('Started');
    await fireEvent(hostOf('DatePicker'), 'dateChange', new Date(2026, 10, 16, 8, 0));
    await fireEvent.press(screen.getAllByLabelText('Close').at(-1)!); // the sheet's close button
    expect(onChange).not.toHaveBeenCalled();
  });

  it('follows the app ThemeMode over the phone', async () => {
    await renderThemed(<IOSField label="Started" value={VALUE} onChange={jest.fn()} />, { phone: 'dark', app: 'light' });
    await press('Started');
    await waitFor(() => expect(hostOf('Host').props.colorScheme).toBe('light'));
  });
});

describe('DateTimeField (Android, Material 3 date + time dialogs)', () => {
  it('Date row opens the date dialog on the draft day; picking keeps the time of day', async () => {
    const onChange = jest.fn();
    await renderThemed(<AndroidField label="Started" value={VALUE} onChange={onChange} minimumDate={MIN} maximumDate={MAX} />);
    await press('Started');
    await press('Date');
    const dialog = hostOf('DatePickerDialog');
    expect(dialog.props.initialDate).toBe('2026-11-17T00:00:00.000Z');
    expect(dialog.props.selectableDates).toEqual({ start: MIN, end: MAX });
    expect(dialog.props.elementColors.selectedDayContainerColor).toBe(LIGHT_COLORS.primaryDark);

    await fireEvent(dialog, 'dateSelected', new Date('2026-11-12T00:00:00.000Z'));
    expect(hosts('DatePickerDialog')).toHaveLength(0);
    await fireEvent.press(screen.getByText('Done'));
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 10, 12, 9, 15));
  });

  it.each([
    [false, '12-hour'],
    [true, '24-hour'],
  ])('Time row opens the clock with is24Hour=%s on a %s device', async (uses24, _label) => {
    mockCalendars.mockReturnValue([{ calendar: 'gregory', timeZone: 'UTC', uses24hourClock: uses24, firstWeekday: 1 }]);
    await renderThemed(<AndroidField label="Started" value={VALUE} onChange={jest.fn()} />);
    await press('Started');
    await press('Time');
    const dialog = hostOf('TimePickerDialog');
    expect(dialog.props.is24Hour).toBe(uses24);
    expect(dialog.props.initialDate).toBe(VALUE.toISOString());
    expect(dialog.props.elementColors.selectorColor).toBe(LIGHT_COLORS.primaryDark);
  });

  it('falls back to the locale when the device setting is unknown', () => {
    mockCalendars.mockReturnValue([{ calendar: 'gregory', timeZone: 'UTC', uses24hourClock: null, firstWeekday: 1 }]);
    const expected = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 === false;
    expect(AndroidModule.deviceUses24HourClock()).toBe(expected);
  });

  it('picking a time keeps the draft day and clamps to the max', async () => {
    const onChange = jest.fn();
    await renderThemed(<AndroidField label="Started" value={VALUE} onChange={onChange} maximumDate={MAX} />);
    await press('Started');
    await press('Time');
    // Native returns the draft's day with the chosen local time (and its seconds).
    await fireEvent(hostOf('TimePickerDialog'), 'dateSelected', new Date(2026, 10, 17, 7, 5, 33));
    await fireEvent.press(screen.getByText('Done'));
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 10, 17, 7, 5));

    await press('Started');
    await press('Time');
    await fireEvent(hostOf('TimePickerDialog'), 'dateSelected', new Date(2026, 10, 17, 23, 0));
    await fireEvent.press(screen.getByText('Done'));
    expect(onChange).toHaveBeenLastCalledWith(MAX);
  });

  it('dismissing a dialog or the sheet changes nothing', async () => {
    const onChange = jest.fn();
    await renderThemed(<AndroidField label="Started" value={VALUE} onChange={onChange} />);
    await press('Started');
    await press('Date');
    await fireEvent(hostOf('DatePickerDialog'), 'dismissRequest');
    await press('Time');
    await fireEvent(hostOf('TimePickerDialog'), 'dismissRequest');
    expect(hosts('TimePickerDialog')).toHaveLength(0);
    await fireEvent.press(screen.getAllByLabelText('Close').at(-1)!); // the sheet's close button
    expect(onChange).not.toHaveBeenCalled();
  });

  it('follows the app ThemeMode both ways', async () => {
    await renderThemed(<AndroidField label="Started" value={VALUE} onChange={jest.fn()} />, { phone: 'light', app: 'dark' });
    await press('Started');
    await press('Time');
    await waitFor(() => expect(hostOf('Host').props.colorScheme).toBe('dark'));
    expect(hostOf('TimePickerDialog').props.elementColors.containerColor).toBe(DARK_COLORS.surface);
  });
});

describe('DateTimeField (web, original sheet)', () => {
  it('still has the hour/minute steppers and commits on Done', async () => {
    const onChange = jest.fn();
    await renderThemed(<WebField label="Started" value={VALUE} onChange={onChange} />);
    await press('Started');
    await fireEvent.press(screen.getByLabelText('Earlier hour'));
    await fireEvent.press(screen.getByText('Done'));
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 10, 17, 8, 15));
  });
});
