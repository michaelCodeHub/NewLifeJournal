import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Icon, IconName } from './Icon';
import { useTheme, SPACE, kit } from '../../context/ThemeContext';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'tinted';
type Size = 'lg' | 'md' | 'sm';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}


export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  disabled,
  fullWidth,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  const k = kit();
  const height = k.button.height[size];

  // Variants map to Material 3 on Android: primary = filled, tinted = tonal,
  // secondary = outlined, ghost = text. Colours stay brand tokens.
  const palette: Record<Variant, { bg: string; fg: keyof typeof colors; border?: string }> = {
    primary: { bg: colors.primaryDark, fg: 'onPrimary' },
    secondary: { bg: colors.surface, fg: k.button.outlinedText, border: colors.borderStrong },
    ghost: { bg: 'transparent', fg: k.button.textButtonText },
    danger: { bg: colors.redTint, fg: 'red' },
    tinted: { bg: colors.primaryLight, fg: 'primaryDark' },
  };
  const p = palette[variant];
  const fg = colors[p.fg];
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      scaleTo={size === 'sm' ? 0.95 : 0.975}
      hitSlop={k.button.touchTarget ? Math.max(0, (k.button.touchTarget - height) / 2) : size === 'sm' ? 7 : size === 'md' ? 3 : 0}
      android_ripple={k.touch === 'ripple' && variant === 'primary' ? { color: colors.rippleOnPrimary } : undefined}
      accessibilityLabel={accessibilityLabel ?? title}
      testID={testID}
      style={[
        styles.base,
        {
          height,
          paddingHorizontal: k.button.paddingX[size],
          borderRadius: k.button.radius[size],
          backgroundColor: p.bg,
          borderWidth: p.border ? StyleSheet.hairlineWidth * 2 : 0,
          borderColor: p.border,
          opacity: isDisabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={k.button.iconSize[size]} color={fg} /> : null}
          <Text variant={k.button.text[size]} color={p.fg} numberOfLines={1}>
            {title}
          </Text>
          {iconRight ? <Icon name={iconRight} size={k.button.iconSize[size]} color={fg} /> : null}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs + 2 },
});
