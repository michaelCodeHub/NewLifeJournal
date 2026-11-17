import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useBaby } from '../../../context/BabyContext';
import { Theme, useThemedStyles, useTheme, SPACE, GUTTER, RADIUS } from '../../../context/ThemeContext';
import {
  Button,
  Card,
  EmptyState,
  Header,
  HeaderAction,
  ListRow,
  ScreenState,
  SegmentedControl,
  Sheet,
  Text,
} from '../../../components/ui';
import { BabyEntry, EntryRow, fromActivity, fromGrowth, fromHealth } from '../../../components/baby/entries';
import { useLogSheets, LogTarget } from '../../../components/baby/useLogSheets';
import { useEntryOptions } from '../../../components/baby/useEntryOptions';
import { dayKey, dayLabel, formatDaySummary, summarizeDay } from '../../../lib/baby';
import { useNow } from '../../../hooks/useNow';
import { trackEvent } from '../../../services/monitoring/analytics';

type Filter = 'all' | 'feeding' | 'diaper' | 'sleep' | 'health';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'feeding', label: 'Feeds' },
  { value: 'diaper', label: 'Diapers' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'health', label: 'Health' },
];

const EMPTY: Record<Filter, string> = {
  all: 'Nothing logged yet',
  feeding: 'No feeds yet',
  diaper: 'No diapers yet',
  sleep: 'No sleep yet',
  health: 'No health entries yet',
};

/**
 * Baby timeline (F22): every feed, diaper, sleep, growth measurement and
 * health entry, grouped by day (Today / Yesterday / date) with a day summary
 * header ("6 feeds · 4 diapers · 8h 20m sleep"). Tap to edit, "…" to delete.
 */
export default function BabyTimelineScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { baby, activities, growth, health, loading } = useBaby();
  const now = useNow();
  const { open, sheets } = useLogSheets();
  const options = useEntryOptions(open);
  const [filter, setFilter] = useState<Filter>('all');
  const [addOpen, setAddOpen] = useState(false);

  const sections = useMemo(() => {
    const entries: BabyEntry[] = [
      ...activities.map((a) => fromActivity(a, now)),
      ...growth.map(fromGrowth),
      ...health.map(fromHealth),
    ]
      .filter((e) => (filter === 'all' ? true : filter === 'health' ? e.kind === 'health' || e.kind === 'growth' : e.kind === filter))
      .sort((a, b) => b.millis - a.millis);

    const byDay = new Map<string, { date: Date; data: BabyEntry[] }>();
    for (const e of entries) {
      const d = new Date(e.millis);
      const k = dayKey(d);
      const g = byDay.get(k);
      if (g) g.data.push(e);
      else byDay.set(k, { date: d, data: [e] });
    }
    return [...byDay.entries()].map(([key, g]) => ({
      key,
      title: dayLabel(g.date, now),
      summary: formatDaySummary(summarizeDay(activities, g.date, now)),
      data: g.data,
    }));
  }, [activities, growth, health, filter, now]);

  if (loading) return <ScreenState loading />;
  if (!baby) {
    return (
      <ScreenState
        icon="happy-outline"
        title="Add your baby"
        action={<Button title="Add baby" onPress={() => router.push('/(onboarding)/create-baby')} />}
      />
    );
  }

  const add = (t: LogTarget) => {
    setAddOpen(false);
    // Let the menu sheet finish closing before the form opens.
    setTimeout(() => open(t), 300);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title="Timeline" right={<HeaderAction name="add" onPress={() => setAddOpen(true)} accessibilityLabel="Add entry" />} />
      <SectionList
        sections={sections}
        keyExtractor={(e) => e.key}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={14}
        windowSize={11}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <SegmentedControl<Filter>
              value={filter}
              onChange={(f) => {
                setFilter(f);
                trackEvent('timeline_filtered', { action: f, source: 'baby' });
              }}
              options={FILTERS}
            />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.dayHeader}>
            <Text variant="overline" color={section.title === 'Today' ? 'primaryDark' : 'textMuted'}>
              {section.title}
            </Text>
            {filter === 'all' || filter === 'feeding' || filter === 'diaper' || filter === 'sleep' ? (
              <Text variant="caption" color="textMuted" numberOfLines={1} style={{ flexShrink: 1 }}>
                {section.summary}
              </Text>
            ) : null}
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.cardSlice,
              index === 0 && styles.cardTop,
              index === section.data.length - 1 && styles.cardBottom,
              index < section.data.length - 1 && styles.cardDivider,
            ]}
          >
            <EntryRow entry={item} onPress={(e) => open(e.target)} onOptions={options.show} />
          </View>
        )}
        ListEmptyComponent={
          <Card style={{ marginTop: SPACE.lg }}>
            <EmptyState
              icon="time-outline"
              title={EMPTY[filter]}
              body="Everything you log appears here, grouped by day."
              action={<Button title="Log something" icon="add" onPress={() => setAddOpen(true)} />}
            />
          </Card>
        }
      />

      <Sheet visible={addOpen} onClose={() => setAddOpen(false)} title="Add to timeline">
        <Card padded={false}>
          <ListRow icon="nutrition-outline" tone="teal" title="Feed" subtitle="Breast, bottle or solids" onPress={() => add({ kind: 'feeding' })} />
          <ListRow icon="water-outline" tone="blue" title="Diaper" subtitle="Wet, dirty or both" onPress={() => add({ kind: 'diaper' })} />
          <ListRow icon="moon-outline" tone="plum" title="Sleep" subtitle="Start a timer or log a nap" onPress={() => add({ kind: 'sleep' })} />
          <ListRow icon="scale-outline" tone="green" title="Growth" subtitle="Weight, length, head" onPress={() => add({ kind: 'growth' })} />
          <ListRow
            icon="medical-outline"
            tone="red"
            title="Health"
            subtitle="Vaccine, checkup, illness, medicine"
            last
            onPress={() => add({ kind: 'health' })}
          />
        </Card>
      </Sheet>

      {sheets}
      {options.element}
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    root: { flex: 1 },
    listContent: { paddingHorizontal: GUTTER, paddingBottom: SPACE.huge },
    listHeader: { paddingTop: SPACE.sm, marginBottom: SPACE.sm },
    dayHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: SPACE.md,
      paddingTop: SPACE.xl,
      paddingBottom: SPACE.sm,
    },
    cardSlice: { backgroundColor: colors.card },
    cardTop: { borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg },
    cardBottom: { borderBottomLeftRadius: RADIUS.lg, borderBottomRightRadius: RADIUS.lg },
    cardDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  });
