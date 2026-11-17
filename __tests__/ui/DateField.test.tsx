import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { DARK_COLORS, LIGHT_COLORS, ThemeProvider } from '../../context/ThemeContext';
import type { DateFieldProps } from '../../components/ui/DateField.types';
import { toComposeDay } from '../../components/ui/dateValue';

// Each platform file is loaded explicitly (Jest itself resolves `./DateField` to the iOS file).
const { DateField: IOSDateField } = require('../../components/ui/DateField.ios.tsx') as { DateField: React.FC<DateFieldProps> };
const { DateField: AndroidDateField } = require('../../components/ui/DateField.android.tsx') as {
  DateField: React.FC<DateFieldProps>;
};
const { DateField: WebDateField } = require('../../components/ui/DateField.tsx') as { DateField: React.FC<DateFieldProps> };

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
const openField = (label: string) => fireEvent.press(screen.getByLabelText(new RegExp(`^${label}:`)));

const NOV_17 = new Date(2026, 10, 17, 12); // stored DateField value: local noon
const MIN = new Date(2026, 10, 3, 18, 45); // awkward times on purpose
const MAX = new Date(2026, 10, 25, 7, 10);

beforeEach(async () => {
  mockPhoneScheme = 'light';
  await AsyncStorage.clear();
});

describe('DateField (iOS, SwiftUI graphical DatePicker)', () => {
  it('opens the native calendar on the current value, with whole min/max days', async () => {
    await renderThemed(<IOSDateField label="Due date" value={NOV_17} onChange={jest.fn()} minimumDate={MIN} maximumDate={MAX} />);
    await openField('Due date');
    const picker = hostOf('DatePicker');
    expect(picker.props.selection).toEqual(NOV_17);
    expect(picker.props.displayedComponents).toEqual(['date']);
    expect(picker.props.range).toEqual({ start: new Date(2026, 10, 3), end: new Date(2026, 10, 25, 23, 59, 59, 999) });
    expect(picker.props.modifiers).toEqual([
      { $type: 'datePickerStyle', args: ['graphical'] },
      { $type: 'tint', args: [LIGHT_COLORS.primaryDark] },
    ]);
  });

  it('Done commits the picked day at local noon', async () => {
    const onChange = jest.fn();
    await renderThemed(<IOSDateField label="Due date" value={NOV_17} onChange={onChange} />);
    await openField('Due date');
    await fireEvent(hostOf('DatePicker'), 'dateChange', new Date(2026, 10, 20, 0, 3));
    expect(onChange).not.toHaveBeenCalled(); // nothing until Done
    await fireEvent.press(screen.getByText('Done'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 10, 20, 12));
  });

  it('Done without changing the day leaves the value untouched (no onChange)', async () => {
    const onChange = jest.fn();
    await renderThemed(<IOSDateField label="Due date" value={new Date(2026, 10, 17, 8, 15)} onChange={onChange} />);
    await openField('Due date');
    await fireEvent.press(screen.getByText('Done'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a day outside min/max is pulled back inside (never stored out of range)', async () => {
    const onChange = jest.fn();
    await renderThemed(<IOSDateField label="Due date" value={NOV_17} onChange={onChange} minimumDate={MIN} maximumDate={MAX} />);
    await openField('Due date');
    await fireEvent(hostOf('DatePicker'), 'dateChange', new Date(2026, 11, 2, 12));
    await fireEvent.press(screen.getByText('Done'));
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 10, 25, 12));
  });

  it('follows the app ThemeMode over the phone', async () => {
    await renderThemed(<IOSDateField label="Due date" value={NOV_17} onChange={jest.fn()} />, { phone: 'light', app: 'dark' });
    await openField('Due date');
    await waitFor(() => expect(hostOf('Host').props.colorScheme).toBe('dark'));
    expect(hostOf('DatePicker').props.modifiers[1]).toEqual({ $type: 'tint', args: [DARK_COLORS.primaryDark] });
  });
});

describe('DateField (Android, Material 3 DatePickerDialog)', () => {
  it('opens the dialog on the value as a UTC day, with local min/max', async () => {
    await renderThemed(<AndroidDateField label="Due date" value={NOV_17} onChange={jest.fn()} minimumDate={MIN} maximumDate={MAX} />);
    expect(hosts('DatePickerDialog')).toHaveLength(0);
    await openField('Due date');
    const dialog = hostOf('DatePickerDialog');
    expect(dialog.props.initialDate).toBe('2026-11-17T00:00:00.000Z');
    expect(dialog.props.initialDate).toBe(toComposeDay(NOV_17));
    expect(dialog.props.selectableDates).toEqual({ start: MIN, end: MAX });
    expect(dialog.props.color).toBe(LIGHT_COLORS.primaryDark);
    expect(dialog.props.elementColors).toMatchObject({
      selectedDayContainerColor: LIGHT_COLORS.primaryDark,
      selectedDayContentColor: LIGHT_COLORS.onPrimary,
    });
  });

  it('OK reports the picked UTC day as that local day at noon, and closes', async () => {
    const onChange = jest.fn();
    await renderThemed(<AndroidDateField label="Due date" value={NOV_17} onChange={onChange} />);
    await openField('Due date');
    await fireEvent(hostOf('DatePickerDialog'), 'dateSelected', new Date('2026-11-20T00:00:00.000Z'));
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 10, 20, 12));
    expect(hosts('DatePickerDialog')).toHaveLength(0);
  });

  it('Cancel / back changes nothing', async () => {
    const onChange = jest.fn();
    await renderThemed(<AndroidDateField label="Due date" value={NOV_17} onChange={onChange} />);
    await openField('Due date');
    await fireEvent(hostOf('DatePickerDialog'), 'dismissRequest');
    expect(onChange).not.toHaveBeenCalled();
    expect(hosts('DatePickerDialog')).toHaveLength(0);
  });

  it('never reports an invalid date', async () => {
    const onChange = jest.fn();
    await renderThemed(<AndroidDateField label="Due date" value={NOV_17} onChange={onChange} />);
    await openField('Due date');
    await fireEvent(hostOf('DatePickerDialog'), 'dateSelected', new Date(NaN));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('follows the app ThemeMode both ways', async () => {
    await renderThemed(<AndroidDateField label="Due date" value={NOV_17} onChange={jest.fn()} />, { phone: 'light', app: 'dark' });
    await openField('Due date');
    await waitFor(() => expect(hostOf('Host').props.colorScheme).toBe('dark'));
    expect(hostOf('DatePickerDialog').props.elementColors.containerColor).toBe(DARK_COLORS.surface);
  });

  it('follows app light mode on a dark phone', async () => {
    await renderThemed(<AndroidDateField label="Due date" value={NOV_17} onChange={jest.fn()} />, { phone: 'dark', app: 'light' });
    await openField('Due date');
    await waitFor(() => expect(hostOf('Host').props.colorScheme).toBe('light'));
  });
});

describe('DateField (web, original calendar sheet)', () => {
  it('picking a day reports it at local noon and respects min/max days', async () => {
    const onChange = jest.fn();
    await renderThemed(<WebDateField label="Due date" value={NOV_17} onChange={onChange} minimumDate={MIN} maximumDate={MAX} />);
    await openField('Due date');
    expect(screen.getByLabelText(new Date(2026, 10, 2).toDateString())).toBeDisabled();
    expect(screen.getByLabelText(new Date(2026, 10, 26).toDateString())).toBeDisabled();
    expect(screen.getByLabelText(new Date(2026, 10, 3).toDateString())).toBeEnabled();
    await fireEvent.press(screen.getByLabelText(new Date(2026, 10, 25).toDateString()));
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 10, 25, 12));
  });
});

describe('DateField (iOS) — dismissing without Done never changes the value', () => {
  const { fireGestureHandler, getByGestureTestId } = require('react-native-gesture-handler/jest-utils');
  const { State } = require('react-native-gesture-handler');

  async function openAndPick(onChange: jest.Mock) {
    await renderThemed(<IOSDateField label="Due date" value={NOV_17} onChange={onChange} />);
    await openField('Due date');
    await fireEvent(hostOf('DatePicker'), 'dateChange', new Date(2026, 10, 20, 12)); // a different day, not confirmed
  }

  it('swipe down', async () => {
    const onChange = jest.fn();
    await openAndPick(onChange);
    const { act } = require('@testing-library/react-native');
    await act(async () =>
      fireGestureHandler(getByGestureTestId('sheet-drag'), [
        { state: State.BEGAN, translationY: 0, velocityY: 0 },
        { state: State.ACTIVE, translationY: 60, velocityY: 300 },
        { state: State.ACTIVE, translationY: 180, velocityY: 600 },
        { state: State.END, translationY: 200, velocityY: 600 },
      ])
    );
    expect(screen.queryByText('Done')).toBeNull(); // the sheet closed
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a short drag snaps back and keeps the sheet open', async () => {
    const onChange = jest.fn();
    await openAndPick(onChange);
    const { act } = require('@testing-library/react-native');
    await act(async () =>
      fireGestureHandler(getByGestureTestId('sheet-drag'), [
        { state: State.BEGAN, translationY: 0, velocityY: 0 },
        { state: State.ACTIVE, translationY: 40, velocityY: 100 },
        { state: State.END, translationY: 40, velocityY: 100 },
      ])
    );
    expect(screen.getByText('Done')).toBeOnTheScreen();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('tapping outside (the backdrop)', async () => {
    const onChange = jest.fn();
    await openAndPick(onChange);
    await fireEvent.press(screen.getAllByLabelText('Close')[0]); // the backdrop comes first
    expect(screen.queryByText('Done')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Android back / the close button', async () => {
    const onChange = jest.fn();
    await openAndPick(onChange);
    await fireEvent.press(screen.getAllByLabelText('Close').at(-1)!);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('re-opening shows the stored value again, not the abandoned pick', async () => {
    const onChange = jest.fn();
    await openAndPick(onChange);
    await fireEvent.press(screen.getAllByLabelText('Close')[0]);
    await openField('Due date');
    expect(hostOf('DatePicker').props.selection).toEqual(NOV_17);
  });
});
