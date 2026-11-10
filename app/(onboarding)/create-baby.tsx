import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Theme, useThemedStyles, GUTTER, SPACE } from '../../context/ThemeContext';
import { Button, IconTile, Pill, Text } from '../../components/ui';

/**
 * Baby tracking isn't built yet. Choose-mode shows it as "Coming soon", but
 * this route still exists, so it renders a calm placeholder.
 */
export default function CreateBabyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);

  // Gentle float for the icon.
  const float = useSharedValue(0);
  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [float]);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -10 * float.value }] }));

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(onboarding)/choose-mode'));

  return (
    <View style={[styles.root, { paddingTop: insets.top + SPACE.xl, paddingBottom: insets.bottom + SPACE.xl }]}>
      <Animated.View entering={FadeInDown.duration(420)} style={styles.content}>
        <Animated.View style={floatStyle}>
          <IconTile name="happy-outline" tone="plum" size={84} />
        </Animated.View>
        <Pill label="Coming soon" tone="plum" icon="sparkles-outline" />
        <Text variant="title1" align="center">
          Baby tracking
        </Text>
        <Text variant="callout" color="textSecondary" align="center" style={styles.body}>
          We&apos;re building something special to help you track your little one&apos;s feeds, sleep, growth and
          precious milestones.
        </Text>
        <View style={styles.dots}>
          <Dot delay={0} />
          <Dot delay={200} />
          <Dot delay={400} />
        </View>
      </Animated.View>

      <View style={styles.actions}>
        <Button
          title="Track my pregnancy"
          size="lg"
          fullWidth
          onPress={() => router.replace('/(onboarding)/create-pregnancy')}
        />
        <Button title="Back" variant="ghost" fullWidth onPress={goBack} />
      </View>
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const styles = useThemedStyles(makeStyles);
  const o = useSharedValue(0.3);
  useEffect(() => {
    o.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1)
    );
  }, [o, delay]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.dot, s]} />;
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: GUTTER },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACE.md },
    body: { maxWidth: 320 },
    dots: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.sm },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.plum },
    actions: { gap: SPACE.sm, width: '100%', maxWidth: 480, alignSelf: 'center' },
  });
