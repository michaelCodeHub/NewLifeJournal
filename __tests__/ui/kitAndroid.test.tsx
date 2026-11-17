import React from 'react';
import { Platform, processColor, StyleSheet, Text as RNText } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
import { DARK_COLORS, LIGHT_COLORS, ThemeProvider } from '../../context/ThemeContext';
import { PressableScale } from '../../components/ui';

/**
 * The kit on Android (Material 3 tokens). Platform.OS is switched for each test;
 * the components read kit() at render time. iOS / web are covered by kitLook.test.tsx.
 */

type Scheme = 'light' | 'dark';
let mockPhoneScheme: Scheme = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: () => mockPhoneScheme }));

let restoreOS: { restore: () => void } | null = null;
beforeEach(async () => {
  restoreOS = jest.replaceProperty(Platform, 'OS', 'android');
  mockPhoneScheme = 'light';
  await AsyncStorage.clear();
});
afterEach(() => restoreOS?.restore());

export async function renderAndroid(ui: React.ReactElement, app: Scheme = 'light') {
  await AsyncStorage.setItem('app_theme_mode', app);
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}
export const flat = (node: { props: { style?: unknown } }) => StyleSheet.flatten(node.props.style as never) ?? {};
/** The native ripple React Native puts on the host view for android_ripple. */
export const rippleOf = (node: { props: Record<string, any> }) =>
  (node.props.nativeBackgroundAndroid ?? node.props.nativeForegroundAndroid) as { type: string; color: unknown } | undefined;

describe('touch feedback (PressableScale)', () => {
  it('uses a clipped Material ripple in the theme ripple colour, no scale or dim', async () => {
    await renderAndroid(
      <PressableScale accessibilityLabel="Tap" onPress={() => {}} style={{ borderRadius: 12 }}>
        <RNText>Tap</RNText>
      </PressableScale>
    );
    const node = screen.getByLabelText('Tap');
    const style = flat(node);
    expect(style.overflow).toBe('hidden');
    expect(style.transform).toBeUndefined();
    expect(style.opacity).toBeUndefined();
    expect(rippleOf(node)).toMatchObject({ type: 'RippleAndroid', color: processColor(LIGHT_COLORS.ripple), borderless: false });
  });

  it('uses the dark ripple token in dark mode', async () => {
    await renderAndroid(
      <PressableScale accessibilityLabel="Tap" onPress={() => {}}>
        <RNText>Tap</RNText>
      </PressableScale>,
      'dark'
    );
    expect(DARK_COLORS.ripple).not.toBe(LIGHT_COLORS.ripple);
    const node = screen.getByLabelText('Tap');
    expect(flat(node).overflow).toBe('hidden');
    expect(rippleOf(node)?.color).toBe(processColor(DARK_COLORS.ripple));
  });
});
