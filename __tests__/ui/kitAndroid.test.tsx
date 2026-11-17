import React from 'react';
import { Platform, processColor, StyleSheet, Text as RNText } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DARK_COLORS, LIGHT_COLORS, ThemeProvider } from '../../context/ThemeContext';
import { PressableScale } from '../../components/ui';

/**
 * The kit on Android (Material 3 tokens). Platform.OS is switched for each test;
 * the components read kit() at render time. iOS / web are covered by kitLook.test.tsx.
 */

jest.mock('react-native/Libraries/Components/Keyboard/KeyboardAvoidingView', () => {
  const React = require('react');
  const Mock = ({ children, ...props }: { children?: React.ReactNode }) => React.createElement('MockKeyboardAvoidingView', props, children);
  return { __esModule: true, default: Mock };
});

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

describe('Button (Material 3)', () => {
  const { Button } = require('../../components/ui') as typeof import('../../components/ui');

  it.each([
    ['lg', 40],
    ['md', 40],
    ['sm', 32],
  ] as const)('%s: %idp, fully rounded, labelLarge in Inter', async (size, height) => {
    await renderAndroid(<Button title="Save" size={size} onPress={() => {}} />);
    const node = screen.getByLabelText('Save');
    const style = flat(node);
    expect(style.height).toBe(height);
    expect(style.borderRadius).toBeGreaterThanOrEqual(height / 2);
    expect(flat(screen.getByText('Save'))).toMatchObject({ fontFamily: 'Inter_500Medium', fontSize: 14, letterSpacing: 0.1 });
  });

  it('small buttons reach the 48dp touch target through hit slop', async () => {
    await renderAndroid(<Button title="Small" size="sm" onPress={() => {}} />);
    expect(screen.getByLabelText('Small').props.hitSlop).toBe(8);
  });

  it('filled = primaryDark with onPrimary text and the on-teal ripple', async () => {
    await renderAndroid(<Button title="Filled" onPress={() => {}} />);
    const node = screen.getByLabelText('Filled');
    expect(flat(node).backgroundColor).toBe(LIGHT_COLORS.primaryDark);
    expect(flat(screen.getByText('Filled')).color).toBe(LIGHT_COLORS.onPrimary);
    expect(rippleOf(node)?.color).toBe(processColor(LIGHT_COLORS.rippleOnPrimary));
  });

  it('outlined (secondary) and text (ghost) buttons use the brand colour for their label', async () => {
    await renderAndroid(
      <>
        <Button title="Outlined" variant="secondary" onPress={() => {}} />
        <Button title="Text" variant="ghost" onPress={() => {}} />
      </>
    );
    expect(flat(screen.getByText('Outlined')).color).toBe(LIGHT_COLORS.primaryDark);
    expect(flat(screen.getByLabelText('Outlined')).borderColor).toBe(LIGHT_COLORS.borderStrong);
    expect(flat(screen.getByText('Text')).color).toBe(LIGHT_COLORS.primaryDark);
    expect(rippleOf(screen.getByLabelText('Text'))?.color).toBe(processColor(LIGHT_COLORS.ripple));
  });
});

describe('Fields (Material 3 outlined)', () => {
  const { TextField, SelectField } = require('../../components/ui') as typeof import('../../components/ui');

  it('56dp, 4dp corners, 1dp outline that turns 2dp primaryDark on focus without moving the text', async () => {
    await renderAndroid(<TextField label="Name" placeholder="Your name" value="" onChangeText={() => {}} />);
    const input = screen.getByPlaceholderText('Your name');
    const wrap = screen.container.queryAll((n) => flat(n).minHeight === 56 && flat(n).borderRadius === 4);
    expect(wrap.length).toBeGreaterThan(0);
    const before = flat(wrap[0]);
    expect(before).toMatchObject({ borderWidth: 1, borderColor: LIGHT_COLORS.borderStrong, paddingHorizontal: 11 });
    await fireEvent(input, 'focus');
    const after = flat(screen.container.queryAll((n) => flat(n).minHeight === 56 && flat(n).borderRadius === 4)[0]);
    expect(after).toMatchObject({ borderWidth: 2, borderColor: LIGHT_COLORS.primaryDark, paddingHorizontal: 10 });
  });

  it('hint is supporting text under the field; an error replaces it (and is announced)', async () => {
    await renderAndroid(
      <>
        <TextField label="Weight" hint="In kilograms" value="" onChangeText={() => {}} />
        <TextField label="Blood pressure" hint="Like 120/80" error="Use the format 120/80" value="12" onChangeText={() => {}} />
      </>
    );
    expect(flat(screen.getByText('In kilograms'))).toMatchObject({ color: LIGHT_COLORS.textSecondary, paddingHorizontal: 16 });
    expect(screen.queryByText('Like 120/80')).toBeNull();
    const error = screen.getByText('Use the format 120/80');
    expect(flat(error).color).toBe(LIGHT_COLORS.red);
    expect(error.props.accessibilityLiveRegion).toBe('polite');
  });

  it('SelectField uses the same outlined box', async () => {
    await renderAndroid(<SelectField label="Type" value="Checkup" onPress={() => {}} />);
    expect(flat(screen.getByLabelText('Type: Checkup'))).toMatchObject({ minHeight: 56, borderRadius: 4 });
  });
});

describe('Card, ListRow, EmptyState (Material 3)', () => {
  const { Card, ListRow, EmptyState } = require('../../components/ui') as typeof import('../../components/ui');

  it('cards: 12dp corners, tonal fill; raised = 1dp outline with no shadow', async () => {
    await renderAndroid(
      <>
        <Card accessibilityLabel="plain" onPress={() => {}}>
          <RNText>plain</RNText>
        </Card>
        <Card accessibilityLabel="raised" tone="raised" onPress={() => {}}>
          <RNText>raised</RNText>
        </Card>
      </>
    );
    expect(flat(screen.getByLabelText('plain'))).toMatchObject({ borderRadius: 12, borderWidth: 0, backgroundColor: LIGHT_COLORS.card });
    const raised = flat(screen.getByLabelText('raised'));
    expect(raised).toMatchObject({ borderRadius: 12, borderWidth: 1, borderColor: LIGHT_COLORS.border });
    expect(raised.elevation).toBeUndefined();
    expect(raised.shadowOpacity).toBeUndefined();
  });

  it('list rows: 56dp one-line, 72dp two-line', async () => {
    await renderAndroid(
      <>
        <ListRow title="One line" onPress={() => {}} />
        <ListRow title="Two lines" subtitle="Subtitle" onPress={() => {}} />
      </>
    );
    // The row bodies (they carry the right padding), in render order.
    const heights = screen.container.queryAll((n) => flat(n).minHeight !== undefined && flat(n).paddingRight === 16).map((n) => flat(n).minHeight);
    expect(heights).toEqual([56, 72]);
  });

  it('empty state: icon in a 64dp round tonal container', async () => {
    await renderAndroid(<EmptyState icon="calendar-outline" title="Nothing yet" />);
    const circle = screen.container.queryAll((n) => flat(n).width === 64 && flat(n).borderRadius === 32);
    expect(circle).toHaveLength(1);
    expect(flat(circle[0]).backgroundColor).toBe(LIGHT_COLORS.primaryLight);
  });
});

describe('Chip and Pill (Material 3)', () => {
  const { Chip, Pill } = require('../../components/ui') as typeof import('../../components/ui');

  it('chips: 32dp, 8dp corners; selected = tonal fill without an outline', async () => {
    await renderAndroid(
      <>
        <Chip label="Off" onPress={() => {}} />
        <Chip label="On" selected onPress={() => {}} />
      </>
    );
    const chips = screen.container.queryAll((n) => flat(n).height === 32 && flat(n).borderRadius === 8);
    expect(chips).toHaveLength(2);
    expect(flat(chips[0])).toMatchObject({ backgroundColor: LIGHT_COLORS.surface, borderColor: LIGHT_COLORS.borderStrong });
    expect(flat(chips[1])).toMatchObject({ backgroundColor: LIGHT_COLORS.primaryLight, borderColor: LIGHT_COLORS.primaryLight });
  });

  it('status pills: 8dp corners', async () => {
    await renderAndroid(<Pill label="Done" tone="green" />);
    const pill = screen.container.queryAll((n) => flat(n).backgroundColor === LIGHT_COLORS.greenTint);
    expect(flat(pill[0]).borderRadius).toBe(8);
  });
});

describe('Toast (Material 3 snackbar shape)', () => {
  const { ToastProvider, useToast } = require('../../components/ui') as typeof import('../../components/ui');
  const { act } = require('@testing-library/react-native');

  it('4dp corners, 48dp tall, small shadow', async () => {
    let show: (m: string) => void = () => {};
    const Grab = () => {
      show = useToast().show;
      return null;
    };
    await renderAndroid(
      <ToastProvider>
        <Grab />
      </ToastProvider>
    );
    jest.useFakeTimers();
    try {
      await act(async () => show('Saved'));
      const toast = screen.container.queryAll((n) => n.props.accessibilityLiveRegion === 'polite' && flat(n).maxWidth === '90%')[0];
      expect(flat(toast)).toMatchObject({ borderRadius: 4, minHeight: 48, elevation: 3 });
      await act(async () => jest.runOnlyPendingTimers());
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('Sheet (Material 3, visual only)', () => {
  const { Sheet } = require('../../components/ui') as typeof import('../../components/ui');

  it('28dp top corners', async () => {
    await renderAndroid(
      <Sheet visible onClose={() => {}} title="Sheet">
        <RNText>Body</RNText>
      </Sheet>
    );
    const sheet = screen.container.queryAll((n) => flat(n).borderTopLeftRadius !== undefined);
    expect(flat(sheet[0])).toMatchObject({ borderTopLeftRadius: 28, borderTopRightRadius: 28 });
  });
});

describe('Header and tab bar (Material 3)', () => {
  const { Header, HeaderAction } = require('../../components/ui') as typeof import('../../components/ui');
  const TabBar = require('../../components/TabBar').default as React.ComponentType<any>;

  it('top app bar: 64dp, titleLarge (Inter), arrow back, 40dp round icon buttons with a ripple', async () => {
    await renderAndroid(<Header title="Visits" variant="bar" right={<HeaderAction name="add" onPress={() => {}} accessibilityLabel="Add" />} />);
    expect(screen.container.queryAll((n) => flat(n).height === 64 && flat(n).flexDirection === 'row')).toHaveLength(1);
    expect(flat(screen.getByText('Visits'))).toMatchObject({ fontFamily: 'Inter_400Regular', fontSize: 22 });
    const back = screen.getByLabelText('Back');
    expect(flat(back)).toMatchObject({ width: 40, height: 40, borderRadius: 20 });
    expect(rippleOf(back)).toMatchObject({ type: 'RippleAndroid', borderless: true, color: processColor(LIGHT_COLORS.ripple) });
    expect(flat(back).backgroundColor).toBeUndefined();
    // Ionicons renders the glyph character: it must be Material's arrow, not the iOS chevron.
    const { Ionicons } = require('@expo/vector-icons');
    const char = (name: string) => String.fromCodePoint(Ionicons.glyphMap[name]);
    const text = JSON.stringify(screen.toJSON());
    expect(text).toContain(JSON.stringify(char('arrow-back-outline')).slice(1, -1));
    expect(text).not.toContain(JSON.stringify(char('chevron-back-outline')).slice(1, -1));
  });

  it('navigation bar: 80dp with a primaryLight indicator behind the selected icon', async () => {
    const props = {
      state: { index: 1, routes: ['home', 'timeline', 'tools', 'chat', 'profile'].map((name) => ({ key: name, name })) },
      emitter: { emit: () => ({ defaultPrevented: false }) },
      navigateToTab: () => {},
    };
    await renderAndroid(<TabBar {...props} />);
    expect(screen.container.queryAll((n) => flat(n).height === 80 && flat(n).flexDirection === 'row')).toHaveLength(1);
    const pills = screen.container.queryAll((n) => flat(n).width === 64 && flat(n).height === 32);
    expect(pills).toHaveLength(5);
    expect(pills.map((p) => flat(p).backgroundColor ?? null)).toEqual([null, LIGHT_COLORS.primaryLight, null, null, null]);
    expect(screen.getByLabelText('Timeline').props.accessibilityState).toMatchObject({ selected: true });
  });
});

describe('Sheet with the keyboard (Android, edge-to-edge)', () => {
  const { Sheet, TextField } = require('../../components/ui') as typeof import('../../components/ui');

  it('pads for the keyboard, and the sheet and its body can shrink so the fields scroll', async () => {
    await renderAndroid(
      <Sheet visible onClose={() => {}} title="Add visit" footer={<RNText>Save</RNText>}>
        <TextField label="Notes" value="" onChangeText={() => {}} />
      </Sheet>
    );
    // KeyboardAvoidingView is mocked as a host element (see top of file) so its props are visible.
    const [kav] = screen.container.queryAll((n) => n.type === 'MockKeyboardAvoidingView');
    expect(kav.props.behavior).toBe('padding');
    const sheet = screen.container.queryAll((n) => flat(n).borderTopLeftRadius === 28)[0];
    expect(flat(sheet).flexShrink).toBe(1);
    // The scroll body (flexGrow 0) can shrink too.
    expect(screen.container.queryAll((n) => flat(n).flexGrow === 0 && flat(n).flexShrink === 1).length).toBeGreaterThan(0);
    // Field height is untouched.
    expect(screen.container.queryAll((n) => flat(n).minHeight === 56 && flat(n).borderRadius === 4)).toHaveLength(1);
  });
});
