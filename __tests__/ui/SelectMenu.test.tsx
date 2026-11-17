import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { LIGHT_COLORS, ThemeProvider } from '../../context/ThemeContext';
import { canUseNativeMenu, NATIVE_MENU_MAX, type SelectMenuProps } from '../../components/ui/SelectMenu.types';
import type { Option } from '../../components/ui/Choice';
import { VISIT_TYPES } from '../../lib/journal';

type Menu = <T extends string>(props: SelectMenuProps<T>) => React.ReactElement;
const { SelectMenu: IOSMenu } = require('../../components/ui/SelectMenu.ios.tsx') as { SelectMenu: Menu };
const { SelectMenu: AndroidMenu } = require('../../components/ui/SelectMenu.android.tsx') as { SelectMenu: Menu };
const { SelectMenu: WebMenu } = require('../../components/ui/SelectMenu.tsx') as { SelectMenu: Menu };

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

type Reason = 'spam' | 'harassment' | 'misinformation' | 'other';
// The community report reasons: 4 options, text + icon — qualifies for a native menu.
const REASONS: Option<Reason>[] = [
  { value: 'spam', label: 'Spam', icon: 'mail-unread-outline' },
  { value: 'harassment', label: 'Harassment', icon: 'sad-outline' },
  { value: 'misinformation', label: 'Medical misinformation', icon: 'alert-circle-outline' },
  { value: 'other', label: 'Other', icon: 'help-circle-outline' },
];
// Visits → Type: 9 options — must stay a sheet.
const VISIT_OPTIONS: Option<string>[] = VISIT_TYPES.map((t) => ({ value: t.label, label: t.label, icon: t.icon }));

const props = (over: Partial<SelectMenuProps<Reason>> = {}): SelectMenuProps<Reason> => ({
  label: 'Reason',
  title: 'Why are you reporting this post?',
  options: REASONS,
  value: 'harassment',
  onSelect: jest.fn(),
  ...over,
});

beforeEach(async () => {
  mockPhoneScheme = 'light';
  await AsyncStorage.clear();
});

describe('the rule (canUseNativeMenu)', () => {
  it('native for short text / text+icon lists, sheet for long, rich or empty lists', () => {
    expect(NATIVE_MENU_MAX).toBe(7);
    expect(canUseNativeMenu(REASONS)).toBe(true);
    expect(canUseNativeMenu(Array.from({ length: 7 }, (_, i) => ({ value: `${i}`, label: `${i}` })))).toBe(true);
    expect(canUseNativeMenu(Array.from({ length: 8 }, (_, i) => ({ value: `${i}`, label: `${i}` })))).toBe(false);
    expect(canUseNativeMenu(VISIT_OPTIONS)).toBe(false);
    expect(canUseNativeMenu([{ value: 'block', label: 'Block', description: "You won't see their posts" }])).toBe(false);
    expect(canUseNativeMenu([])).toBe(false);
  });
});

describe('SelectMenu (iOS, SwiftUI Menu)', () => {
  it('keeps the field accessibility label and checks only the selected option', async () => {
    await renderThemed(<IOSMenu {...props()} />);
    const menu = hostOf('Menu');
    expect(menu.props.modifiers).toEqual(
      expect.arrayContaining([
        { $type: 'accessibilityLabel', args: ['Reason: Harassment'] },
        { $type: 'tint', args: [LIGHT_COLORS.primaryDark] },
      ])
    );
    const items = hosts('Toggle');
    expect(items.map((t) => t.props.label)).toEqual(REASONS.map((r) => r.label));
    expect(items.map((t) => t.props.isOn)).toEqual([false, true, false, false]);
  });

  it('calls onSelect once per tap, including the selected option (same as OptionSheet)', async () => {
    const onSelect = jest.fn();
    await renderThemed(<IOSMenu {...props({ onSelect })} />);
    await fireEvent(hosts('Toggle')[2], 'isOnChange', true);
    expect(onSelect).toHaveBeenLastCalledWith('misinformation');
    await fireEvent(hosts('Toggle')[1], 'isOnChange', false); // re-tap the checked one
    expect(onSelect).toHaveBeenLastCalledWith('harassment');
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('shows the placeholder (muted) when nothing is selected', async () => {
    await renderThemed(<IOSMenu {...props({ value: undefined, placeholder: 'Choose a reason' })} />);
    expect(hostOf('Menu').props.modifiers[0]).toEqual({ $type: 'accessibilityLabel', args: ['Reason: Choose a reason'] });
    expect(hosts('Toggle').every((t) => t.props.isOn === false)).toBe(true);
  });

  it('long lists fall back to the field + sheet', async () => {
    await renderThemed(<IOSMenu label="Type" title="Visit type" options={VISIT_OPTIONS} value="Ultrasound" onSelect={jest.fn()} />);
    expect(hosts('Menu')).toHaveLength(0);
    expect(screen.getByLabelText('Type: Ultrasound')).toBeOnTheScreen();
  });

  it('follows the app ThemeMode', async () => {
    await renderThemed(<IOSMenu {...props()} />, { phone: 'light', app: 'dark' });
    await waitFor(() => expect(hostOf('Host').props.colorScheme).toBe('dark'));
  });
});

describe('SelectMenu (Android, Material 3 DropdownMenu)', () => {
  it('keeps the SelectField trigger and its accessibility label; menu closed until tapped', async () => {
    await renderThemed(<AndroidMenu {...props()} />);
    expect(hostOf('DropdownMenu').props.expanded).toBe(false);
    await fireEvent.press(screen.getByLabelText('Reason: Harassment'));
    expect(hostOf('DropdownMenu').props.expanded).toBe(true);
    const items = hosts('SelectableDropdownMenuItem');
    expect(items.map((i) => i.props.selected)).toEqual([false, true, false, false]);
    expect(items[1].props.colors).toMatchObject({
      selectedContainerColor: LIGHT_COLORS.primaryDark,
      selectedTextColor: LIGHT_COLORS.onPrimary,
    });
    expect(screen.getByText('Medical misinformation')).toBeOnTheScreen();
  });

  it('a tap calls onSelect once and closes; dismissing selects nothing', async () => {
    const onSelect = jest.fn();
    await renderThemed(<AndroidMenu {...props({ onSelect })} />);
    await fireEvent.press(screen.getByLabelText('Reason: Harassment'));
    await fireEvent(hosts('SelectableDropdownMenuItem')[0], 'click');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('spam');
    expect(hostOf('DropdownMenu').props.expanded).toBe(false);

    await fireEvent.press(screen.getByLabelText('Reason: Harassment'));
    await fireEvent(hostOf('DropdownMenu'), 'dismissRequest');
    expect(hostOf('DropdownMenu').props.expanded).toBe(false);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('re-selecting the selected option still calls onSelect (same as OptionSheet)', async () => {
    const onSelect = jest.fn();
    await renderThemed(<AndroidMenu {...props({ onSelect })} />);
    await fireEvent.press(screen.getByLabelText('Reason: Harassment'));
    await fireEvent(hosts('SelectableDropdownMenuItem')[1], 'click');
    expect(onSelect).toHaveBeenCalledWith('harassment');
  });

  it('rich lists (descriptions) fall back to the sheet', async () => {
    await renderThemed(
      <AndroidMenu label="Action" title="Post" options={[{ value: 'block', label: 'Block', description: 'Hidden from you' }]} onSelect={jest.fn()} />
    );
    expect(hosts('DropdownMenu')).toHaveLength(0);
  });

  it('follows the app ThemeMode', async () => {
    await renderThemed(<AndroidMenu {...props()} />, { phone: 'dark', app: 'light' });
    await waitFor(() => expect(hostOf('Host').props.colorScheme).toBe('light'));
  });
});

describe('SelectMenu sheet (web always; iOS/Android fallback) — the behaviour OptionSheet has today', () => {
  it('web uses the sheet even for short lists, with the same label, selected state and onSelect', async () => {
    const onSelect = jest.fn();
    await renderThemed(<WebMenu {...props({ onSelect })} />);
    expect(hosts('Menu')).toHaveLength(0);
    expect(hosts('DropdownMenu')).toHaveLength(0);
    await fireEvent.press(screen.getByLabelText('Reason: Harassment'));

    // Exactly the selected option's row is marked selected for screen readers.
    const selected = screen.container.queryAll((n) => n.props.accessibilityState?.selected === true);
    expect(selected.length).toBeGreaterThan(0);
    for (const node of selected) expect(within(node).getByText('Harassment')).toBeOnTheScreen();
    expect(screen.getByText('Medical misinformation')).toBeOnTheScreen();

    await fireEvent.press(screen.getAllByText('Harassment').at(-1)!); // the sheet row of the selected option: still reported
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('harassment');
  });

  it('Visits → Type (9 options) behaves identically through SelectMenu on iOS', async () => {
    const onSelect = jest.fn();
    await renderThemed(<IOSMenu label="Type" title="Visit type" options={VISIT_OPTIONS} value="Checkup" onSelect={onSelect} />);
    await fireEvent.press(screen.getByLabelText('Type: Checkup'));
    expect(screen.getByText('Visit type')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Glucose test'));
    expect(onSelect).toHaveBeenCalledWith('Glucose test');
  });
});
