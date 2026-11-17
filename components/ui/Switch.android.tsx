import React, { useMemo } from 'react';
import { Host, Switch as ComposeSwitch } from '@expo/ui/jetpack-compose';
import { semantics, testID as testIDModifier } from '@expo/ui/jetpack-compose/modifiers';
import { useTheme } from '../../context/ThemeContext';
import type { SwitchProps } from './Switch.types';

export type { SwitchProps } from './Switch.types';

/**
 * Kit Switch — Android: a native Material 3 Switch (Jetpack Compose) via @expo/ui.
 *
 * - Every colour comes from theme tokens; on = `primaryDark` track with an
 *   `onPrimary` thumb (white on the brand teal `primary` is only 3:1).
 * - `colorScheme` follows the app's ThemeMode (not only the phone setting).
 * - `accessibilityLabel` becomes the TalkBack content description.
 */
export function Switch({ value, onValueChange, disabled, accessibilityLabel, testID }: SwitchProps) {
  const { colors, isDark, resolvedTheme } = useTheme();

  const switchColors = useMemo(() => {
    const offThumb = isDark ? colors.textSecondary : colors.textMuted;
    return {
      checkedTrackColor: colors.primaryDark,
      checkedBorderColor: colors.primaryDark,
      checkedThumbColor: colors.onPrimary,
      checkedIconColor: colors.primaryDark,
      uncheckedTrackColor: colors.surfaceTertiary,
      uncheckedBorderColor: offThumb,
      uncheckedThumbColor: offThumb,
      uncheckedIconColor: colors.surfaceTertiary,
      disabledCheckedTrackColor: colors.primaryLight,
      disabledCheckedBorderColor: colors.primaryLight,
      disabledCheckedThumbColor: colors.surface,
      disabledCheckedIconColor: colors.primaryLight,
      disabledUncheckedTrackColor: colors.surfaceSecondary,
      disabledUncheckedBorderColor: colors.borderStrong,
      disabledUncheckedThumbColor: colors.borderStrong,
      disabledUncheckedIconColor: colors.surfaceSecondary,
    };
  }, [colors, isDark]);

  const modifiers = useMemo(
    () => [
      ...(accessibilityLabel ? [semantics({ contentDescription: accessibilityLabel })] : []),
      ...(testID ? [testIDModifier(testID)] : []),
    ],
    [accessibilityLabel, testID]
  );

  return (
    <Host matchContents colorScheme={resolvedTheme}>
      <ComposeSwitch
        value={value}
        onCheckedChange={onValueChange}
        enabled={!disabled}
        colors={switchColors}
        modifiers={modifiers}
      />
    </Host>
  );
}
