import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { haptics } from '../../lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** How far to shrink when pressed. 0.97 for cards, 0.94 for small buttons. */
  scaleTo?: number;
  /** Fire a light haptic on press. Default true. */
  haptic?: boolean | 'light' | 'medium' | 'selection';
  children?: React.ReactNode;
}

/**
 * Pressable with a quick, springy scale + slight dim, running on the UI thread.
 * This replaces TouchableOpacity everywhere so every tap feels the same.
 */
export function PressableScale({
  scaleTo = 0.97,
  haptic = true,
  style,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  children,
  ...rest
}: PressableScaleProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - scaleTo) * pressed.value }],
    opacity: 1 - 0.08 * pressed.value,
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      accessibilityState={{ disabled: !!disabled, ...(rest.accessibilityState ?? {}) }}
      onPressIn={(e) => {
        pressed.value = withTiming(1, { duration: 90 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withSpring(0, { damping: 18, stiffness: 320, mass: 0.6 });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) {
          if (haptic === 'medium') haptics.medium();
          else if (haptic === 'selection') haptics.selection();
          else haptics.light();
        }
        onPress?.(e);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
