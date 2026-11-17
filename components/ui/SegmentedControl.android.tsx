import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Host, SegmentedButton, SingleChoiceSegmentedButtonRow, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, weight } from '@expo/ui/jetpack-compose/modifiers';
import { useTheme } from '../../context/ThemeContext';
import { haptics } from '../../lib/haptics';
import { selectedIndex, type SegmentedControlProps } from './SegmentedControl.types';

/**
 * Kit SegmentedControl — Android: Material 3 single-choice segmented buttons
 * (Jetpack Compose) via @expo/ui.
 *
 * - Full width, equal segments; long labels ellipsize on one line.
 * - Selected = `primaryDark` fill with `onPrimary` text (white on the brand teal
 *   `primary` is only 3:1). Unselected = `surfaceSecondary` with `textSecondary`.
 * - `colorScheme` follows the app's ThemeMode.
 */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const { colors, resolvedTheme } = useTheme();
  const index = selectedIndex(options, value);

  const buttonColors = useMemo(
    () => ({
      activeContainerColor: colors.primaryDark,
      activeContentColor: colors.onPrimary,
      activeBorderColor: colors.primaryDark,
      inactiveContainerColor: colors.surfaceSecondary,
      inactiveContentColor: colors.textSecondary,
      inactiveBorderColor: colors.borderStrong,
    }),
    [colors]
  );
  const rowModifiers = useMemo(() => [fillMaxWidth()], []);
  const buttonModifiers = useMemo(() => [weight(1)], []);

  return (
    <Host matchContents={{ vertical: true }} colorScheme={resolvedTheme} style={styles.host}>
      <SingleChoiceSegmentedButtonRow modifiers={rowModifiers}>
        {options.map((o, i) => (
          <SegmentedButton
            key={o.value}
            selected={i === index}
            onClick={() => {
              // Re-tapping the selected segment is a no-op on every platform.
              if (o.value === value) return;
              haptics.selection();
              onChange(o.value);
            }}
            colors={buttonColors}
            modifiers={buttonModifiers}
          >
            <SegmentedButton.Label>
              <Text maxLines={1} overflow="ellipsis">
                {o.label}
              </Text>
            </SegmentedButton.Label>
          </SegmentedButton>
        ))}
      </SingleChoiceSegmentedButtonRow>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: { alignSelf: 'stretch' },
});
