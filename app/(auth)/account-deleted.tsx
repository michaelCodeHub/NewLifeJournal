import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme, GUTTER, SPACE } from '../../context/ThemeContext';
import { Button, IconTile, Text } from '../../components/ui';

/** Shown once after account deletion (PRD F03), before returning to sign-in. */
export default function AccountDeletedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + SPACE.xl }]}>
      <Animated.View entering={FadeInDown.duration(320)} style={styles.content}>
        <IconTile name="checkmark-circle-outline" tone="green" size={64} />
        <Text variant="title1" align="center">
          Your account and all data have been deleted.
        </Text>
        <Text variant="callout" color="textSecondary" align="center">
          Thank you for using Bloom & Bump. We wish you and your family all the best.
        </Text>
      </Animated.View>
      <Button title="Done" size="lg" fullWidth onPress={() => router.replace('/(auth)/login')} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: GUTTER, justifyContent: 'space-between' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACE.lg, maxWidth: 420, alignSelf: 'center' },
});
