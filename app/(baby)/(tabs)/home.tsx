import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useBaby } from '../../../context/BabyContext';
import { useAuth } from '../../../context/AuthContext';
import { Theme, useThemedStyles, useTheme, SPACE, RADIUS, GUTTER, elevation } from '../../../context/ThemeContext';
import {
  BrandGradient,
  Button,
  Card,
  EmptyState,
  Header,
  PressableScale,
  ScreenState,
  SectionHeader,
  Text,
} from '../../../components/ui';
import { Icon, IconName } from '../../../components/ui/Icon';
import { RunningTimerCard } from '../../../components/baby/RunningTimerCard';
import { useLogSheets } from '../../../components/baby/useLogSheets';
import { useEntryOptions } from '../../../components/baby/useEntryOptions';
import { EntryRow, fromActivity } from '../../../components/baby/entries';
import { ageLabel, dayOfLife, formatAgo, formatMinutes, lastOfType, summarizeDay } from '../../../lib/baby';
import { greeting, longDate } from '../../../lib/journal';
import { useNow } from '../../../hooks/useNow';

const HERO = {
  ink: '#FFFFFF',
  soft: 'rgba(255,255,255,0.86)',
  faint: 'rgba(255,255,255,0.62)',
  line: 'rgba(255,255,255,0.22)',
  fill: 'rgba(255,255,255,0.16)',
};

/**
 * Baby home (F16): who and how old, today's totals, anything running, one-tap
 * logging (Feed · Diaper · Sleep · Growth), and the latest entries.
 */
export default function BabyHomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user, userProfile } = useAuth();
  const { baby, activities, loading, error, runningFeed, runningSleep } = useBaby();
  const now = useNow();
  const { open, sheets } = useLogSheets({ restoreDrafts: true });
  const options = useEntryOptions(open);

  const today = useMemo(() => summarizeDay(activities, now, now), [activities, now]);
  const recent = useMemo(() => activities.slice(0, 5).map((a) => fromActivity(a, now)), [activities, now]);
  const lastFeed = lastOfType(activities, 'feeding');
  const lastDiaper = lastOfType(activities, 'diaper');

  if (loading) return <ScreenState loading />;
  if (error && !baby) return <ScreenState title="Couldn't load your baby's journal" body={error} icon="cloud-offline-outline" />;
  if (!baby) {
    return (
      <ScreenState
        icon="happy-outline"
        title="Add your baby"
        body="Set up your baby's profile to start logging feeds, diapers and sleep."
        action={<Button title="Add baby" onPress={() => router.push('/(onboarding)/create-baby')} />}
      />
    );
  }

  const birth = baby.birthDate.toDate();
  const day = dayOfLife(birth, now);
  const parentName = (userProfile?.name && userProfile.name !== 'User' ? userProfile.name : user?.displayName || '').split(' ')[0];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header brand title="Bloom & Bump" />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text variant="title2">
          {greeting(now)}
          {parentName ? `, ${parentName}` : ''}
        </Text>

        {/* Baby card */}
        <BrandGradient style={[styles.hero, styles.heroShadow]}>
          <View style={styles.heroChip}>
            <Text variant="caption" style={{ color: HERO.ink }}>
              {ageLabel(birth, now)}
            </Text>
          </View>
          <Text variant="display" numberOfLines={2} style={{ color: HERO.ink }}>
            {day === 1 ? `Welcome, ${baby.name}!` : baby.name}
          </Text>
          <Text variant="callout" style={{ color: HERO.soft }}>
            Day {day} of your journey · Born {longDate(birth)}
          </Text>
          <View style={styles.heroStats}>
            <HeroStat label="Feeds today" value={String(today.feeds)} />
            <View style={styles.heroStatDivider} />
            <HeroStat label="Diapers" value={String(today.diapers)} />
            <View style={styles.heroStatDivider} />
            <HeroStat label="Sleep" value={today.sleepMinutes ? formatMinutes(today.sleepMinutes) : '0 min'} />
          </View>
        </BrandGradient>

        {runningFeed ? <RunningTimerCard activity={runningFeed} /> : null}
        {runningSleep ? <RunningTimerCard activity={runningSleep} /> : null}

        {/* Quick log */}
        <View>
          <SectionHeader title="Log" />
          <View style={styles.shortcuts}>
            <Shortcut icon="nutrition-outline" label="Feed" onPress={() => open({ kind: 'feeding' })} />
            <Shortcut icon="water-outline" label="Diaper" onPress={() => open({ kind: 'diaper' })} />
            <Shortcut icon="moon-outline" label="Sleep" onPress={() => open({ kind: 'sleep' })} />
            <Shortcut icon="scale-outline" label="Growth" onPress={() => open({ kind: 'growth' })} />
          </View>
        </View>

        {/* Since last */}
        <View style={styles.since}>
          <Card style={styles.sinceCard}>
            <Text variant="caption" color="textMuted">
              Last feed
            </Text>
            <Text variant="headline">{runningFeed ? 'Feeding now' : lastFeed ? formatAgo(lastFeed.startedAt.toDate(), now) : '—'}</Text>
          </Card>
          <Card style={styles.sinceCard}>
            <Text variant="caption" color="textMuted">
              Last diaper
            </Text>
            <Text variant="headline">{lastDiaper ? formatAgo(lastDiaper.startedAt.toDate(), now) : '—'}</Text>
          </Card>
        </View>

        {/* Recent */}
        <View>
          <SectionHeader title="Recent" action={recent.length ? 'See all' : undefined} onAction={() => router.push('/(baby)/(tabs)/timeline')} />
          <Card padded={false}>
            {recent.length ? (
              recent.map((e, i) => (
                <View key={e.key} style={i < recent.length - 1 ? styles.divider : undefined}>
                  <EntryRow entry={e} onPress={(x) => open(x.target)} onOptions={options.show} />
                </View>
              ))
            ) : (
              <EmptyState icon="time-outline" title="Nothing logged yet" body="Tap Feed, Diaper or Sleep above — it takes a few seconds." />
            )}
          </Card>
        </View>
      </ScrollView>

      {sheets}
      {options.element}
    </View>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="caption" style={{ color: HERO.faint }}>
        {label}
      </Text>
      <Text variant="calloutMedium" numberOfLines={1} tabular style={{ color: HERO.ink }}>
        {value}
      </Text>
    </View>
  );
}

function Shortcut({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} scaleTo={0.94} accessibilityLabel={`Log ${label.toLowerCase()}`} style={shortcutStyles.item}>
      <View style={[shortcutStyles.circle, { backgroundColor: colors.primaryLight }]}>
        <Icon name={icon} size={22} color={colors.primaryDark} />
      </View>
      <Text variant="caption" color="textSecondary" numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

const shortcutStyles = StyleSheet.create({
  item: { flex: 1, alignItems: 'center', gap: SPACE.sm },
  circle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});

const makeStyles = ({ colors, isDark }: Theme) =>
  StyleSheet.create({
    root: { flex: 1 },
    body: { paddingHorizontal: GUTTER, paddingTop: SPACE.md, paddingBottom: SPACE.huge, gap: SPACE.xxl },
    heroShadow: { ...elevation(isDark, 2) },
    hero: { gap: SPACE.sm, padding: SPACE.xl, borderRadius: RADIUS.xl, overflow: 'hidden' },
    heroChip: {
      alignSelf: 'flex-start',
      paddingHorizontal: SPACE.sm,
      paddingVertical: 3,
      borderRadius: RADIUS.pill,
      backgroundColor: HERO.fill,
    },
    heroStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.md,
      marginTop: SPACE.md,
      paddingTop: SPACE.lg,
      borderTopWidth: StyleSheet.hairlineWidth * 2,
      borderTopColor: HERO.line,
    },
    heroStatDivider: { width: StyleSheet.hairlineWidth * 2, alignSelf: 'stretch', backgroundColor: HERO.line },
    shortcuts: { flexDirection: 'row', justifyContent: 'space-between' },
    since: { flexDirection: 'row', gap: SPACE.md, marginTop: -SPACE.md },
    sinceCard: { flex: 1, gap: 2 },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  });
