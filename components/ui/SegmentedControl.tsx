import React, { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme, RADIUS, elevation } from '../../context/ThemeContext';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import type { SegmentedControlProps } from './SegmentedControl.types';

/**
 * Kit SegmentedControl — web version (the original custom control, unchanged).
 * iOS and Android use native controls from @expo/ui: see SegmentedControl.ios.tsx /
 * SegmentedControl.android.tsx.
 */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const { colors, isDark } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(0);
  const segW = width > 0 ? (width - 4) / options.length : 0;
  const lastIndex = useRef(index);
  const lastSegW = useRef(0);

  useEffect(() => {
    if (!segW) return;
    const target = index * segW;
    // Place the thumb instantly on first layout and on resize; only animate when
    // the selection itself changes. A short eased timing (no spring) means it
    // glides and stops — no overshoot, no wobble, even when frames drop.
    if (lastSegW.current === 0 || segW !== lastSegW.current || lastIndex.current === index) {
      x.value = target;
    } else {
      x.value = withTiming(target, { duration: 220, easing: Easing.out(Easing.cubic) });
    }
    lastSegW.current = segW;
    lastIndex.current = index;
  }, [index, segW, x]);

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => {
        // Round so sub-pixel relayouts (fonts, scrollbars on web) don't retrigger.
        const w = Math.round(e.nativeEvent.layout.width);
        setWidth((prev) => (prev === w ? prev : w));
      }}
      style={[styles.seg, { backgroundColor: colors.surfaceSecondary }]}
      accessibilityRole="tablist"
    >
      {segW > 0 ? (
        <Animated.View
          style={[
            styles.thumb,
            { width: segW, backgroundColor: isDark ? colors.surfaceTertiary : colors.surface },
            elevation(isDark, 1),
            thumb,
          ]}
        />
      ) : null}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <PressableScale
            key={o.value}
            haptic="selection"
            scaleTo={0.97}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={styles.segItem}
          >
            <Text variant="calloutMedium" color={active ? 'textPrimary' : 'textSecondary'} numberOfLines={1}>
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', borderRadius: RADIUS.sm, padding: 2, height: 30 },
  thumb: { position: 'absolute', top: 2, left: 2, bottom: 2, borderRadius: RADIUS.xs },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
