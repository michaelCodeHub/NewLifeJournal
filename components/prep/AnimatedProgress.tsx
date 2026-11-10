import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { TONES, Tone } from '../ui';

/** ProgressBar that eases to its new value instead of jumping (same look as the kit's ProgressBar). */
export function AnimatedProgress({ value, tone = 'teal', height = 6 }: { value: number; tone?: Tone; height?: number }) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  const p = useSharedValue(pct);

  useEffect(() => {
    p.value = withTiming(pct, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [pct, p]);

  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  const fg = tone === 'teal' ? colors.primary : colors[TONES[tone].fg];

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={{ height, borderRadius: height, backgroundColor: colors.surfaceTertiary, overflow: 'hidden' }}
    >
      <Animated.View style={[{ height: '100%', borderRadius: height, backgroundColor: fg }, fill]} />
    </View>
  );
}
