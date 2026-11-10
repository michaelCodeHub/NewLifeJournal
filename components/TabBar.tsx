import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, SPACE } from '../context/ThemeContext';
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

/** Fixed bar height (above the home-indicator inset). Nothing in the bar ever moves or resizes. */
const BAR_HEIGHT = 52;

/**
 * Bottom navigation. Deliberately still: no scale, spring or slide on tap —
 * only the icon fill and colour change, like Instagram. Every slot is a fixed
 * box, so swapping line → filled glyphs can't nudge the layout.
 */
export default function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { colors } = useTheme();
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
          height: BAR_HEIGHT + insets.bottom,
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
            style={styles.item}
          >
            <View style={styles.iconBox}>
              <Icon name={meta.icon} size={22} color={color} />
            </View>
            <Text variant="caption" numberOfLines={1} style={[styles.label, { color }]}>
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
});
