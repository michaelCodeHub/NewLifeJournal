import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, IconName } from './Icon';
import { useTheme, RADIUS, SPACE, kit } from '../../context/ThemeContext';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { Sheet } from './Sheet';

/* ------------------------------------------------------ SegmentedControl */

// Native on iOS/Android (@expo/ui), the original custom control on web.
// Metro picks SegmentedControl.ios.tsx / .android.tsx / .tsx per platform.
export { SegmentedControl } from './SegmentedControl';

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
  const k = kit().chip;
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.95}
      accessibilityState={{ selected: !!selected }}
      style={[
        styles.chip,
        {
          height: k.height,
          borderRadius: k.radius,
          backgroundColor: selected ? colors.primaryLight : colors.surface,
          // Material 3 filter chips (Android) drop the outline when selected.
          borderColor: selected ? (k.selectedBorder ? colors.primaryDark : colors.primaryLight) : colors.borderStrong,
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
              {o.icon ? <Icon name={o.icon} size={20} color={active ? colors.primaryDark : colors.textSecondary} /> : null}
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
              {active ? <Icon name="checkmark" size={20} color={colors.primaryDark} /> : null}
            </PressableScale>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACE.md - 2,
    borderWidth: 1,
  },
  optionList: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: RADIUS.lg, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingHorizontal: SPACE.lg, paddingVertical: 11 },
});
