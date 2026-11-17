import React from 'react';
import { Switch as RNSwitch } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import type { SwitchProps } from './Switch.types';

export type { SwitchProps } from './Switch.types';

/**
 * Kit Switch — web version (react-native-web Switch).
 * iOS and Android use native controls from @expo/ui: see Switch.ios.tsx / Switch.android.tsx.
 *
 * On = `primaryDark` (white on the brand teal `primary` is only 3:1).
 */
export function Switch({ value, onValueChange, disabled, accessibilityLabel, testID }: SwitchProps) {
  const { colors, isDark } = useTheme();
  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      trackColor={{ false: colors.surfaceTertiary, true: colors.primaryDark }}
      thumbColor={value ? colors.onPrimary : isDark ? colors.textSecondary : colors.surface}
    />
  );
}
