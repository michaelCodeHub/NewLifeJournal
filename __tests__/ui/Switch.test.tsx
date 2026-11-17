import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { DARK_COLORS, LIGHT_COLORS, ThemeProvider } from '../../context/ThemeContext';
import type { SwitchProps } from '../../components/ui/Switch.types';

// Each platform file is loaded explicitly (Jest itself resolves `./Switch` to the iOS file).
const { Switch: IOSSwitch } = require('../../components/ui/Switch.ios.tsx') as {
  Switch: React.FC<SwitchProps>;
};
const { Switch: AndroidSwitch } = require('../../components/ui/Switch.android.tsx') as {
  Switch: React.FC<SwitchProps>;
};
const { Switch: WebSwitch } = require('../../components/ui/Switch.tsx') as { Switch: React.FC<SwitchProps> };

type Scheme = 'light' | 'dark';

// The phone's appearance, as seen by ThemeProvider's useColorScheme().
let mockPhoneScheme: Scheme = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockPhoneScheme,
}));

/** Render inside ThemeProvider with a given phone appearance and app ThemeMode. */
async function renderThemed(ui: React.ReactElement, { phone = 'light', app = 'system' }: { phone?: Scheme; app?: Scheme | 'system' } = {}) {
  mockPhoneScheme = phone;
  await AsyncStorage.setItem('app_theme_mode', app);
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const hostOf = (type: string) => {
  const [node] = screen.container.queryAll((n) => n.type === `ExpoUI.${type}`);
  if (!node) throw new Error(`No ExpoUI.${type} rendered`);
  return node;
};
const modifierTypes = (node: { props: { modifiers?: { $type: string }[] } }) =>
  (node.props.modifiers ?? []).map((m) => m.$type);
const modifierArg = (node: { props: { modifiers?: { $type: string; args: unknown[] }[] } }, type: string) =>
  node.props.modifiers?.find((m) => m.$type === type)?.args[0];

beforeEach(async () => {
  mockPhoneScheme = 'light';
  await AsyncStorage.clear();
});

describe('Switch (iOS, SwiftUI Toggle)', () => {
  it('renders a themed switch-style toggle and reports changes', async () => {
    const onValueChange = jest.fn();
    await renderThemed(<IOSSwitch value={false} onValueChange={onValueChange} accessibilityLabel="Kick reminders" />);

    const toggle = hostOf('Toggle');
    expect(toggle.props.isOn).toBe(false);
    expect(toggle.props.label).toBe('Kick reminders');
    expect(modifierTypes(toggle)).toEqual(['toggleStyle', 'labelsHidden', 'tint']);
    expect(modifierArg(toggle, 'tint')).toBe(LIGHT_COLORS.primaryDark);

    await fireEvent(toggle, 'isOnChange', true);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('adds the disabled modifier when disabled', async () => {
    await renderThemed(<IOSSwitch value disabled />);
    expect(modifierTypes(hostOf('Toggle'))).toContain('disabled');
  });

  it('follows the app ThemeMode over the phone setting', async () => {
    await renderThemed(<IOSSwitch value />, { phone: 'light', app: 'dark' });
    await waitFor(() => expect(hostOf('Host').props.colorScheme).toBe('dark'));
    expect(modifierArg(hostOf('Toggle'), 'tint')).toBe(DARK_COLORS.primaryDark);
  });

  it('follows app light mode on a dark phone', async () => {
    await renderThemed(<IOSSwitch value />, { phone: 'dark', app: 'light' });
    await waitFor(() => expect(hostOf('Host').props.colorScheme).toBe('light'));
  });

  it('follows the phone when the app is on System', async () => {
    await renderThemed(<IOSSwitch value />, { phone: 'dark', app: 'system' });
    await waitFor(() => expect(hostOf('Host').props.colorScheme).toBe('dark'));
  });
});

describe('Switch (Android, Material 3 Switch)', () => {
  it('uses theme tokens, the accessibility label and reports changes', async () => {
    const onValueChange = jest.fn();
    await renderThemed(<AndroidSwitch value onValueChange={onValueChange} accessibilityLabel="Share anonymous usage" />);

    const sw = hostOf('Switch');
    expect(sw.props.value).toBe(true);
    expect(sw.props.enabled).toBe(true);
    expect(sw.props.colors.checkedTrackColor).toBe(LIGHT_COLORS.primaryDark);
    expect(sw.props.colors.checkedThumbColor).toBe(LIGHT_COLORS.onPrimary);
    expect(modifierArg(sw, 'semantics')).toEqual({ contentDescription: 'Share anonymous usage' });

    await fireEvent(sw, 'checkedChange', false);
    expect(onValueChange).toHaveBeenCalledWith(false);
  });

  it('maps disabled to enabled=false', async () => {
    await renderThemed(<AndroidSwitch value={false} disabled />);
    expect(hostOf('Switch').props.enabled).toBe(false);
  });

  it('follows the app ThemeMode both ways', async () => {
    await renderThemed(<AndroidSwitch value />, { phone: 'light', app: 'dark' });
    await waitFor(() => expect(hostOf('Host').props.colorScheme).toBe('dark'));
    expect(hostOf('Switch').props.colors.checkedTrackColor).toBe(DARK_COLORS.primaryDark);
  });

  it('follows app light mode on a dark phone', async () => {
    await renderThemed(<AndroidSwitch value />, { phone: 'dark', app: 'light' });
    await waitFor(() => expect(hostOf('Host').props.colorScheme).toBe('light'));
  });
});

describe('Switch (web, react-native-web Switch)', () => {
  it('keeps the RN Switch with primaryDark as the on track', async () => {
    const onValueChange = jest.fn();
    await renderThemed(<WebSwitch value={false} onValueChange={onValueChange} accessibilityLabel="Daily tips" />);

    const sw = screen.getByLabelText('Daily tips');
    expect(sw.props.value).toBe(false);
    await fireEvent(sw, 'valueChange', true);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});
