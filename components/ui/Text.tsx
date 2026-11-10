import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { useTheme, TYPE, TypeVariant, ThemeColors } from '../../context/ThemeContext';

export interface TextProps extends RNTextProps {
  /** Type-scale step. Defaults to `body`. */
  variant?: TypeVariant;
  /** A theme color token. Defaults to `textPrimary`. */
  color?: keyof ThemeColors;
  align?: TextStyle['textAlign'];
  /** Use tabular figures (timers, counters, numbers in columns). */
  tabular?: boolean;
}

/** The only Text the app should use: always on the type scale, always theme-colored. */
export function Text({ variant = 'body', color = 'textPrimary', align, tabular, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      {...rest}
      style={[
        TYPE[variant],
        { color: colors[color] },
        align ? { textAlign: align } : null,
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    />
  );
}
