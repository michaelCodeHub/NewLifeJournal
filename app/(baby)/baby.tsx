import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme, useThemedStyles, GUTTER, SPACE } from '../../context/ThemeContext';
import { Button, Card, EmptyState, Pill } from '../../components/ui';

/** Baby mode isn't built yet; onboarding lists it as "Coming soon". */
export default function BabyHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.root, { paddingTop: insets.top + SPACE.xl, paddingBottom: insets.bottom + SPACE.xl }]}>
      <Card style={styles.card}>
        <View style={styles.pill}>
          <Pill label="Coming soon" tone="plum" icon="sparkles-outline" />
        </View>
        <EmptyState
          icon="happy-outline"
          tone="plum"
          title="Baby mode is coming soon"
          body="Feeds, sleep, growth and milestones for your little one. We're building it now. Until then, keep your pregnancy journal going."
          action={
            <Button
              title="Track my pregnancy"
              icon="leaf-outline"
              onPress={() => router.replace('/(onboarding)/create-pregnancy')}
            />
          }
        />
      </Card>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: GUTTER, justifyContent: 'center' },
    card: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingTop: SPACE.xl },
    pill: { alignItems: 'center' },
  });
