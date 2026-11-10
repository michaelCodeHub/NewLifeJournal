import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { PressableScale } from '../ui';
import { elevation, ThemeColors, useTheme } from '../../context/ThemeContext';

export interface PulseButtonProps {
  /** Fill color token. Text inside should use `onPrimary`. */
  color: keyof ThemeColors;
  /** Pulse ring runs while true. */
  active: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  disabled?: boolean;
  size?: number;
  children?: React.ReactNode;
}

const PULSE_MS = 1800;

/** One expanding, fading ring behind the button. Runs entirely on the UI thread. */
function Ring({ size, color, active, delay }: { size: number; color: string; active: boolean; delay: number }) {
  const progress = useSharedValue(0);
  const visible = useSharedValue(0);

  useEffect(() => {
    if (active) {
      visible.value = withTiming(1, { duration: 200 });
      progress.value = 0;
      progress.value = withDelay(
        delay,
        withRepeat(withTiming(1, { duration: PULSE_MS, easing: Easing.out(Easing.cubic) }), -1, false)
      );
    } else {
      visible.value = withTiming(0, { duration: 250 });
      cancelAnimation(progress);
    }
    return () => cancelAnimation(progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: visible.value * 0.28 * (1 - progress.value),
    transform: [{ scale: 1 + 0.38 * progress.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
    />
  );
}

/**
 * The big round tap target used by the kick counter and contraction timer.
 * A soft pulse ring breathes around it while a session/contraction is live.
 */
export function PulseButton({
  color,
  active,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  disabled,
  size = 180,
  children,
}: PulseButtonProps) {
  const { colors, isDark } = useTheme();
  const fill = colors[color];
  const room = Math.round(size * 0.22);

  return (
    <View style={[styles.wrap, { width: size + room * 2, height: size + room * 2 }]}>
      <Ring size={size} color={fill} active={active} delay={0} />
      <Ring size={size} color={fill} active={active} delay={PULSE_MS / 2} />
      <PressableScale
        onPress={onPress}
        disabled={disabled}
        haptic={false}
        scaleTo={0.94}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={[
          styles.button,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: fill, opacity: disabled ? 0.5 : 1 },
          elevation(isDark, 2),
        ]}
      >
        {children}
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  button: { alignItems: 'center', justifyContent: 'center', gap: 4 },
});
