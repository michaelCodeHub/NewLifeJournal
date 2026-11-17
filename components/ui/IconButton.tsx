import React from 'react';
import { Icon, IconName, containerIconSize } from './Icon';
import { useTheme, RADIUS, ThemeColors } from '../../context/ThemeContext';
import { PressableScale } from './PressableScale';
import { View } from 'react-native';

export interface IconButtonProps {
  name: IconName;
  onPress?: () => void;
  accessibilityLabel: string;
  /** `plain` = transparent, `filled` = soft fill, `outline` = hairline border. */
  variant?: 'plain' | 'filled' | 'outline';
  size?: number;
  /** Glyph size. Defaults to ~half the button; top bars use 24 to match the tab bar. */
  iconSize?: number;
  color?: keyof ThemeColors;
  badge?: boolean;
  disabled?: boolean;
}

/** 32pt visual, 44pt touch target (hitSlop). */
export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  variant = 'filled',
  size = 32,
  iconSize,
  color = 'textPrimary',
  badge,
  disabled,
}: IconButtonProps) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.92}
      hitSlop={(44 - size) / 2 + 2}
      accessibilityLabel={accessibilityLabel}
      style={{
        width: size,
        height: size,
        borderRadius: RADIUS.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: variant === 'filled' ? colors.surfaceSecondary : 'transparent',
        borderWidth: variant === 'outline' ? 1 : 0,
        borderColor: colors.border,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Icon name={name} size={iconSize ?? containerIconSize(Math.round(size * 0.55))} color={colors[color]} />
      {badge ? (
        <View
          style={{
            position: 'absolute',
            top: 7,
            right: 7,
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: colors.red,
            borderWidth: 1.5,
            borderColor: colors.surfaceSecondary,
          }}
        />
      ) : null}
    </PressableScale>
  );
}
