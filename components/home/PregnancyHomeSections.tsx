import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme, RADIUS, SPACE } from '../../context/ThemeContext';
import { Card, EmptyState, IconTile, ListRow, SectionHeader, Skeleton, Text } from '../ui';
import type { WeekInfo } from '../../services/firebase/weekInfoService';
import type { HospitalVisit, Milestone, Symptom } from '../../types';
import { nextAppointment, recentEntries, relativeDay, tipOfTheDay, type RecentEntry } from '../../lib/homeFeed';

/**
 * The lower half of the pregnancy Home, all from data the app already has:
 * what's coming up, what this week means for you, and what you logged lately.
 */

const longDay = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

/* ------------------------------------------------------------ Coming up */

export function ComingUp({
  visits,
  weekInfo,
  onOpenVisits,
  onAddVisit,
}: {
  visits: HospitalVisit[];
  weekInfo: WeekInfo | null;
  onOpenVisits: () => void;
  onAddVisit: () => void;
}) {
  const next = useMemo(() => nextAppointment(visits), [visits]);
  // What's usually scheduled around this week (e.g. "Anatomy scan"), from the week's info.
  const usual = weekInfo?.pregnancyInfo?.appointments?.[0] ?? weekInfo?.pregnancyInfo?.tests?.[0];

  return (
    <View>
      <SectionHeader title="Coming up" />
      <Card padded={false}>
        {next ? (
          <ListRow
            icon={next.icon}
            tile
            tone="green"
            title={next.title}
            subtitle={`${longDay(next.date)} · ${relativeDay(next.date)}`}
            onPress={onOpenVisits}
            last={!usual}
          />
        ) : (
          <ListRow
            icon="calendar-outline"
            tile
            tone="green"
            title="No appointment saved"
            subtitle="Add your next visit and it will show here"
            onPress={onAddVisit}
            accessibilityLabel="Add your next appointment"
            last={!usual}
          />
        )}
        {usual ? (
          <ListRow icon="clipboard-outline" tile tone="blue" title="Usually around this week" subtitle={usual} chevron={false} last />
        ) : null}
      </Card>
    </View>
  );
}

/* ---------------------------------------------------- For you this week */

export function ForYouThisWeek({
  weekInfo,
  loading,
  onMore,
}: {
  weekInfo: WeekInfo | null;
  loading: boolean;
  onMore: () => void;
}) {
  const { colors } = useTheme();
  const changes = weekInfo?.motherChanges.slice(0, 2) ?? [];
  const tip = weekInfo ? tipOfTheDay(weekInfo.tips) : null;
  if (!loading && changes.length === 0 && !tip) return null;

  return (
    <View>
      <SectionHeader title="For you this week" action="More" onAction={onMore} />
      <Card tone="tinted" tint="plumTint" onPress={onMore} accessibilityLabel="Read more about your body this week">
        {loading ? (
          <View style={{ gap: SPACE.sm }}>
            <Skeleton width="80%" />
            <Skeleton width="65%" />
          </View>
        ) : (
          <View style={{ gap: SPACE.md }}>
            {changes.length > 0 ? (
              <View style={{ gap: SPACE.sm }}>
                {changes.map((item, i) => (
                  <View key={i} style={styles.bullet}>
                    <View style={[styles.dot, { backgroundColor: colors.plum }]} />
                    <Text variant="body" color="textSecondary" style={{ flex: 1 }}>
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            {tip ? (
              <View style={[styles.tip, { backgroundColor: colors.surface }]}>
                <IconTile name="sparkles-outline" tone="plum" size={30} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="caption" color="plum">
                    Tip for today
                  </Text>
                  <Text variant="callout" color="textPrimary">
                    {tip}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        )}
      </Card>
    </View>
  );
}

/* ------------------------------------------------------ Recently logged */

const KIND_TONE = { visit: 'green', symptom: 'orange', milestone: 'gold' } as const;

export function RecentlyLogged({
  visits,
  symptoms,
  milestones,
  onSeeAll,
  onOpen,
}: {
  visits: HospitalVisit[];
  symptoms: Symptom[];
  milestones: Milestone[];
  onSeeAll: () => void;
  onOpen: (entry: RecentEntry) => void;
}) {
  const recent = useMemo(() => recentEntries({ visits, symptoms, milestones }), [visits, symptoms, milestones]);

  return (
    <View>
      <SectionHeader title="Recently logged" action={recent.length ? 'See all' : undefined} onAction={recent.length ? onSeeAll : undefined} />
      {recent.length ? (
        <Card padded={false}>
          {recent.map((e, i) => (
            <ListRow
              key={e.key}
              icon={e.icon}
              tile
              tone={KIND_TONE[e.kind]}
              title={e.title}
              subtitle={relativeDay(e.date)}
              onPress={() => onOpen(e)}
              last={i === recent.length - 1}
            />
          ))}
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon="book-outline"
            title="Nothing logged yet"
            body="Symptoms, visits and milestones you log will show up here. Start with a shortcut above."
          />
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: SPACE.md, borderRadius: RADIUS.md },
});
