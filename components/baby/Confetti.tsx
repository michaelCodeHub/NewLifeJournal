import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

const COUNT = 40;

/** One-shot confetti burst for the "Your baby has arrived" celebration. Decorative only. */
export const Confetti = memo(function Confetti() {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const palette = [colors.primary, colors.gold, colors.plum, colors.orange, colors.green];
  const pieces = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        x: Math.random() * width,
        drift: (Math.random() - 0.5) * 120,
        delay: Math.random() * 600,
        duration: 2200 + Math.random() * 1600,
        spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540),
        size: 6 + Math.random() * 6,
        round: i % 3 === 0,
        color: palette[i % palette.length],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width]
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pieces.map((p, i) => (
        <Piece key={i} {...p} fall={height + 40} />
      ))}
    </View>
  );
});

function Piece({
  x,
  drift,
  delay,
  duration,
  spin,
  size,
  round,
  color,
  fall,
}: {
  x: number;
  drift: number;
  delay: number;
  duration: number;
  spin: number;
  size: number;
  round: boolean;
  color: string;
  fall: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.quad) }));
  }, [t, delay, duration]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.85 ? 1 : (1 - t.value) / 0.15,
    transform: [{ translateY: -30 + t.value * fall }, { translateX: t.value * drift }, { rotate: `${t.value * spin}deg` }],
  }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', top: 0, left: x, width: size, height: round ? size : size * 1.6, borderRadius: round ? size / 2 : 2, backgroundColor: color },
        style,
      ]}
    />
  );
}
