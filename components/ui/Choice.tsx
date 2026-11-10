import React, { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Icon, IconName } from './Icon';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme, RADIUS, SPACE, elevation } from '../../context/ThemeContext';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { Sheet } from './Sheet';

/* ------------------------------------------------------ SegmentedControl */

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
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

/* ------------------------------------------------------------------ Chip */

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.95}
      accessibilityState={{ selected: !!selected }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primaryLight : colors.surface,
          borderColor: selected ? colors.primaryDark : colors.borderStrong,
        },
      ]}
    >
      {icon ? <Icon name={icon} size={13} color={selected ? colors.primaryDark : colors.textSecondary} /> : null}
      <Text variant="calloutMedium" color={selected ? 'primaryDark' : 'textSecondary'}>
        {label}
      </Text>
    </PressableScale>
  );
}

/* ----------------------------------------------------------- OptionSheet */

export interface Option<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: IconName;
}

/** A Sheet listing options with a checkmark on the selected one. Replaces the old hand-rolled pickers. */
export function OptionSheet<T extends string>({
  visible,
  onClose,
  title,
  options,
  value,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: Option<T>[];
  value?: T;
  onSelect: (v: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={[styles.optionList, { borderColor: colors.border }]}>
        {options.map((o, i) => {
          const active = o.value === value;
          return (
            <PressableScale
              key={o.value}
              haptic="selection"
              scaleTo={0.985}
              accessibilityState={{ selected: active }}
              onPress={() => {
                onSelect(o.value);
                onClose();
              }}
              style={[
                styles.option,
                i < options.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: colors.border },
                active && { backgroundColor: colors.primaryLight },
              ]}
            >
              {o.icon ? <Icon name={o.icon} size={18} color={active ? colors.primaryDark : colors.textSecondary} /> : null}
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color={active ? 'primaryDark' : 'textPrimary'}>
                  {o.label}
                </Text>
                {o.description ? (
                  <Text variant="footnote" color="textSecondary">
                    {o.description}
                  </Text>
                ) : null}
              </View>
              {active ? <Icon name="checkmark" size={18} color={colors.primaryDark} /> : null}
            </PressableScale>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', borderRadius: RADIUS.sm, padding: 2, height: 30 },
  thumb: { position: 'absolute', top: 2, left: 2, bottom: 2, borderRadius: RADIUS.xs },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACE.md - 2,
    height: 28,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  optionList: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: RADIUS.lg, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingHorizontal: SPACE.lg, paddingVertical: 11 },
});
