import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon, IconName } from '../../components/ui/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, SPACE, GUTTER } from '../../context/ThemeContext';
import { BrandTile, Card, IconTile, Pill, Text } from '../../components/ui';

export default function ChooseModeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + SPACE.huge }]}>
      <View style={styles.intro}>
        <BrandTile size={56} style={{ marginBottom: SPACE.md }} />
        <Text variant="overline" color="primaryDark">
          Welcome
        </Text>
        <Text variant="display">What are you tracking?</Text>
        <Text variant="body" color="textSecondary">
          You can switch later. Everything stays in one private journal.
        </Text>
      </View>

      <View style={{ gap: SPACE.md }}>
        <Card onPress={() => router.push('/(onboarding)/create-pregnancy')} style={styles.option} accessibilityLabel="Track my pregnancy">
          <IconTile name="heart-outline" tone="teal" size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="headline">My pregnancy</Text>
            <Text variant="footnote" color="textSecondary">
              Week-by-week development, visits, symptoms and an AI companion.
            </Text>
          </View>
          <Icon name="chevron-forward" size={18} color={colors.textMuted} />
        </Card>

        <Card style={[styles.option, { opacity: 0.6 }]} accessibilityLabel="My baby, coming soon">
          <IconTile name="happy-outline" tone="plum" size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="headline">My baby</Text>
            <Text variant="footnote" color="textSecondary">
              Feeds, sleep, diapers and growth.
            </Text>
          </View>
          <Pill label="Coming soon" tone="plum" />
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: GUTTER, gap: SPACE.xxxl },
  intro: { gap: SPACE.sm, maxWidth: 420 },
  option: { flexDirection: 'row', alignItems: 'center', gap: SPACE.lg, paddingVertical: SPACE.xl },
});
