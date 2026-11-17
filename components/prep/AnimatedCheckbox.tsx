import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { Icon, IconName, containerIconSize } from '../ui/Icon';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme, RADIUS } from '../../context/ThemeContext';

/**
 * Rounded checkbox that fills with the brand color and pops the checkmark in
 * when checked. Purely visual: the parent row owns the press + haptics.
 */
export function AnimatedCheckbox({ checked, size = 24 }: { checked: boolean; size?: number }) {
  const { colors } = useTheme();
  const progress = useSharedValue(checked ? 1 : 0);
  const scale = useSharedValue(1);
  const mounted = useRef(false);

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, { duration: 180 });
    // Skip the bounce on first render so a list of checked items doesn't all pop at once.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (checked) {
      scale.value = withSequence(
        withTiming(0.82, { duration: 80 }),
        withSpring(1, { damping: 9, stiffness: 340, mass: 0.6 }),
      );
    }
  }, [checked, progress, scale]);

  const off = colors.surface;
  const on = colors.primaryDark;
  const border = colors.borderStrong;

  const boxStyle = useAnimatedStyle(
    () => ({
      backgroundColor: interpolateColor(progress.value, [0, 1], [off, on]),
      borderColor: interpolateColor(progress.value, [0, 1], [border, on]),
      transform: [{ scale: scale.value }],
    }),
    [off, on, border],
  );

  const checkStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.4 + 0.6 * progress.value }],
  }));

  return (
    <Animated.View
      style={[styles.box, { width: size, height: size, borderRadius: Math.round(size * 0.3) }, boxStyle]}
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={checkStyle}>
        <Icon name="checkmark" size={containerIconSize(Math.round(size * 0.68))} color={colors.onPrimary} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.xs,
  },
});
