import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { DARK_COLORS, LIGHT_COLORS, ThemeProvider } from '../../context/ThemeContext';
import type { SegmentedControlProps } from '../../components/ui/SegmentedControl.types';

type Seg = <T extends string>(props: SegmentedControlProps<T>) => React.ReactElement;
// Each platform file is loaded explicitly (Jest itself resolves `./SegmentedControl` to the iOS file).
const { SegmentedControl: IOSSeg } = require('../../components/ui/SegmentedControl.ios.tsx') as { SegmentedControl: Seg };
const { SegmentedControl: AndroidSeg } = require('../../components/ui/SegmentedControl.android.tsx') as {
  SegmentedControl: Seg;
};
const { SegmentedControl: WebSeg } = require('../../components/ui/SegmentedControl.tsx') as { SegmentedControl: Seg };
// The public import path must keep working.
const { SegmentedControl: KitSeg } = require('../../components/ui') as { SegmentedControl: Seg };

jest.mock('../../lib/haptics', () => ({ haptics: { selection: jest.fn() } }));

type Scheme = 'light' | 'dark';
let mockPhoneScheme: Scheme = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockPhoneScheme,
}));

type Filter = 'all' | 'visits' | 'symptoms';
const OPTIONS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'visits', label: 'Visits' },
  { value: 'symptoms', label: 'Symptoms' },
];

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

beforeEach(async () => {
  mockPhoneScheme = 'light';
  await AsyncStorage.clear();
});

it('is the iOS version on the kit import path under Jest (ios platform)', () => {
  expect(KitSeg).toBe(IOSSeg);
});

describe('SegmentedControl (iOS, SwiftUI segmented Picker)', () => {
  it('renders every option as a tagged segment with the current selection', async () => {
    await renderThemed(<IOSSeg value="visits" onChange={jest.fn()} options={OPTIONS} />);
    const picker = hostOf('Picker');
    expect(picker.props.selection).toBe(1);
    expect(picker.props.modifiers).toEqual([{ $type: 'pickerStyle', args: ['segmented'] }]);
    for (const o of OPTIONS) expect(screen.getByText(o.label)).toBeOnTheScreen();
  });

  it('maps the native selection index back to the option value', async () => {
    const onChange = jest.fn();
    await renderThemed(<IOSSeg value="all" onChange={onChange} options={OPTIONS} />);
    await fireEvent(hostOf('Picker'), 'selectionChange', 2);
    expect(onChange).toHaveBeenCalledWith('symptoms');
  });

  it('does not call onChange when the selected segment is reported again', async () => {
    const onChange = jest.fn();
    await renderThemed(<IOSSeg value="visits" onChange={onChange} options={OPTIONS} />);
    await fireEvent(hostOf('Picker'), 'selectionChange', 1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('selects the first segment when the value is not an option (as before)', async () => {
    await renderThemed(<IOSSeg value={'unknown' as Filter} onChange={jest.fn()} options={OPTIONS} />);
    expect(hostOf('Picker').props.selection).toBe(0);
  });

  it('follows the app ThemeMode, not just the phone', async () => {
    await renderThemed(<IOSSeg value="all" onChange={jest.fn()} options={OPTIONS} />, { phone: 'light', app: 'dark' });
    await waitFor(() => expect(hostOf('Host').props.colorScheme).toBe('dark'));
  });

  it('follows app light mode on a dark phone', async () => {
    await renderThemed(<IOSSeg value="all" onChange={jest.fn()} options={OPTIONS} />, { phone: 'dark', app: 'light' });
    await waitFor(() => expect(hostOf('Host').props.colorScheme).toBe('light'));
  });
});

describe('SegmentedControl (Android, Material 3 segmented buttons)', () => {
  it('renders full-width equal segments with token colours', async () => {
    await renderThemed(<AndroidSeg value="visits" onChange={jest.fn()} options={OPTIONS} />);
    expect(hostOf('SingleChoiceSegmentedButtonRow').props.modifiers).toEqual([{ $type: 'fillMaxWidth', args: [] }]);

    const buttons = hosts('SegmentedButton');
    expect(buttons.map((b) => b.props.selected)).toEqual([false, true, false]);
    expect(buttons[0].props.modifiers).toEqual([{ $type: 'weight', args: [1] }]);
    expect(buttons[0].props.colors).toMatchObject({
      activeContainerColor: LIGHT_COLORS.primaryDark,
      activeContentColor: LIGHT_COLORS.onPrimary,
      inactiveContentColor: LIGHT_COLORS.textSecondary,
    });
    expect(screen.getByText('Symptoms').props.maxLines).toBe(1);
  });

  it('reports the tapped option', async () => {
    const onChange = jest.fn();
    await renderThemed(<AndroidSeg value="all" onChange={onChange} options={OPTIONS} />);
    await fireEvent(hosts('SegmentedButton')[1], 'click');
    expect(onChange).toHaveBeenCalledWith('visits');
  });

  it('does not call onChange when the selected segment is tapped again', async () => {
    const onChange = jest.fn();
    await renderThemed(<AndroidSeg value="visits" onChange={onChange} options={OPTIONS} />);
    await fireEvent(hosts('SegmentedButton')[1], 'click');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('follows the app ThemeMode both ways', async () => {
    await renderThemed(<AndroidSeg value="all" onChange={jest.fn()} options={OPTIONS} />, { phone: 'light', app: 'dark' });
    await waitFor(() => expect(hostOf('Host').props.colorScheme).toBe('dark'));
    expect(hostOf('SegmentedButton').props.colors.activeContainerColor).toBe(DARK_COLORS.primaryDark);
  });

  it('follows app light mode on a dark phone', async () => {
    await renderThemed(<AndroidSeg value="all" onChange={jest.fn()} options={OPTIONS} />, { phone: 'dark', app: 'light' });
    await waitFor(() => expect(hostOf('Host').props.colorScheme).toBe('light'));
  });
});

describe('SegmentedControl (web, original custom control)', () => {
  it('renders tabs with the selected state and reports presses', async () => {
    const onChange = jest.fn();
    await renderThemed(<WebSeg value="all" onChange={onChange} options={OPTIONS} />);
    expect(screen.getByRole('tab', { name: 'All' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Visits' })).not.toBeSelected();
    await fireEvent.press(screen.getByRole('tab', { name: 'Symptoms' }));
    expect(onChange).toHaveBeenCalledWith('symptoms');
  });

  it('does not call onChange when the selected segment is tapped again', async () => {
    const onChange = jest.fn();
    await renderThemed(<WebSeg value="all" onChange={onChange} options={OPTIONS} />);
    await fireEvent.press(screen.getByRole('tab', { name: 'All' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('still selects the first segment when the value is not an option', async () => {
    const onChange = jest.fn();
    await renderThemed(<WebSeg value={'unknown' as Filter} onChange={onChange} options={OPTIONS} />);
    await fireEvent.press(screen.getByRole('tab', { name: 'All' }));
    expect(onChange).toHaveBeenCalledWith('all');
  });
});
