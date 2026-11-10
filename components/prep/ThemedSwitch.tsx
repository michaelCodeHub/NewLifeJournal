import React from 'react';
import { Platform, Switch, SwitchProps } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

/** react-native Switch with theme track/thumb colors (on = primaryDark). */
export function ThemedSwitch(props: Omit<SwitchProps, 'trackColor' | 'thumbColor' | 'ios_backgroundColor'>) {
  const { colors, isDark } = useTheme();
  return (
    <Switch
      {...props}
      trackColor={{ false: colors.surfaceTertiary, true: colors.primaryDark }}
      ios_backgroundColor={colors.surfaceTertiary}
      // iOS draws its own white thumb; Android needs one that reads on both tracks.
      thumbColor={
        Platform.OS === 'ios' ? undefined : props.value ? colors.onPrimary : isDark ? colors.textSecondary : colors.surface
      }
    />
  );
}
