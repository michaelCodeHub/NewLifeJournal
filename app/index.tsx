import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useTheme, SPACE } from '../context/ThemeContext';
import { BrandTile } from '../components/ui';

/**
 * Entry route: the brand tile fades in while auth resolves (continuing the
 * native splash). The AuthGate in app/_layout.tsx decides where to go next.
 */
export default function Index() {
  const { colors } = useTheme();
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) });
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: 0.96 + 0.04 * o.value }] }));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Animated.View style={style}>
        <BrandTile size={88} />
      </Animated.View>
      <ActivityIndicator color={colors.textMuted} style={{ marginTop: SPACE.xxl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
