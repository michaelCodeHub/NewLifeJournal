import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, SPACE, kit } from '../context/ThemeContext';
import { haptics } from '../lib/haptics';
import { Icon, IconName } from './ui/Icon';
import { Text } from './ui';

/** Five labelled tabs, always in this order. Linear-style: always line icons; the selected tab only changes colour. */
const TABS: Record<string, { label: string; icon: IconName }> = {
  home: { label: 'Home', icon: 'home-outline' },
  timeline: { label: 'Timeline', icon: 'calendar-clear-outline' },
  tools: { label: 'Tools', icon: 'grid-outline' },
  chat: { label: 'Ask', icon: 'chatbubble-ellipses-outline' },
  profile: { label: 'You', icon: 'person-circle-outline' },
};

/** Material 3 navigation bar active indicator (Android): a pill behind the selected icon. */
const INDICATOR = { width: 64, height: 32 };

/**
 * Bottom navigation. Deliberately still: no scale, spring or slide on tap —
 * only the icon fill and colour change, like Instagram. Every slot is a fixed
 * box, so swapping line → filled glyphs can't nudge the layout.
 */
export default function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { colors } = useTheme();
  const k = kit();
  // Fixed bar height (above the home-indicator inset): 52 (iOS / web), Material's 80dp on Android.
  const barHeight = k.tabBar.height;
  const indicator = k.tabBar.indicator;
  const insets = useSafeAreaInsets();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // Android: hide the bar while typing so it doesn't sit on top of the keyboard.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const a = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const b = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  if (keyboardOpen) return null;

  return (
    <View
      style={[
        styles.bar,
        {
          height: barHeight + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const meta = TABS[route.name];
        if (!meta) return null;
        const focused = state.index === index;
        const color = focused ? colors.primaryDark : colors.textMuted;
        return (
          <Pressable
            key={route.key}
            onPress={() => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                haptics.selection();
                navigateToTab(route.key);
              }
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={meta.label}
            android_ripple={k.touch === 'ripple' ? { color: colors.ripple, borderless: true, radius: INDICATOR.width / 2 } : undefined}
            style={styles.item}
          >
            {indicator ? (
              <View style={[styles.indicator, focused ? { backgroundColor: colors.primaryLight } : null]}>
                <Icon name={meta.icon} size={22} color={color} />
              </View>
            ) : (
              <View style={styles.iconBox}>
                <Icon name={meta.icon} size={22} color={color} />
              </View>
            )}
            <Text variant="caption" numberOfLines={1} style={[styles.label, indicator ? styles.labelM3 : null, { color }]}>
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: SPACE.xs },
  iconBox: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 2, height: 14, textAlign: 'center' },
  indicator: {
    width: INDICATOR.width,
    height: INDICATOR.height,
    borderRadius: INDICATOR.height / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelM3: { marginTop: SPACE.xs },
});
