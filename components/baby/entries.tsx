import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Theme, useThemedStyles, SPACE } from '../../context/ThemeContext';
import { IconButton, IconTile, Pill, PressableScale, Text, Tone } from '../ui';
import type { IconName } from '../ui/Icon';
import { activityDetail, activityTitle, BABY_LOOK, healthIcon, healthTitle, HEALTH_TYPES, isRunning, timeOfDay } from '../../lib/baby';
import type { BabyActivity, GrowthRecord, HealthEvent } from '../../types';
import type { LogTarget } from './useLogSheets';

export type EntryKind = 'feeding' | 'diaper' | 'sleep' | 'growth' | 'health';

/** One row in the baby timeline / recent list, whatever it came from. */
export interface BabyEntry {
  key: string;
  id: string;
  kind: EntryKind;
  millis: number;
  title: string;
  detail: string;
  notes?: string;
  icon: IconName;
  tone: Tone;
  running?: boolean;
  /** What to open to edit it. */
  target: LogTarget;
}

export const fromActivity = (a: BabyActivity, now = new Date()): BabyEntry => ({
  key: `a-${a.id}`,
  id: a.id,
  kind: a.type,
  millis: a.startedAt.toMillis(),
  title: activityTitle(a),
  detail: activityDetail(a, now),
  notes: a.notes,
  icon: BABY_LOOK[a.type].icon,
  tone: BABY_LOOK[a.type].tone,
  running: isRunning(a),
  target: { kind: a.type, activity: a },
});

export const fromGrowth = (g: GrowthRecord): BabyEntry => ({
  key: `g-${g.id}`,
  id: g.id,
  kind: 'growth',
  millis: g.date.toMillis(),
  title: 'Growth',
  detail: [g.weightKg ? `${g.weightKg} kg` : null, g.heightCm ? `${g.heightCm} cm` : null, g.headCm ? `head ${g.headCm} cm` : null]
    .filter(Boolean)
    .join(' · '),
  notes: g.notes,
  icon: BABY_LOOK.growth.icon,
  tone: BABY_LOOK.growth.tone,
  target: { kind: 'growth', record: g },
});

export const fromHealth = (h: HealthEvent): BabyEntry => ({
  key: `h-${h.id}`,
  id: h.id,
  kind: 'health',
  millis: h.date.toMillis(),
  title: healthTitle(h),
  detail: [
    HEALTH_TYPES.find((t) => t.value === h.type)?.label,
    h.nextDate ? `next ${h.nextDate.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : null,
  ]
    .filter(Boolean)
    .join(' · '),
  notes: h.notes,
  icon: healthIcon(h.type),
  tone: BABY_LOOK.health.tone,
  target: { kind: 'health', event: h },
});

/** A tappable row: tap to edit, "…" (or long-press) for options. */
export const EntryRow = memo(function EntryRow({
  entry,
  onPress,
  onOptions,
  showTime = true,
}: {
  entry: BabyEntry;
  onPress: (e: BabyEntry) => void;
  onOptions: (e: BabyEntry) => void;
  showTime?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const time = entry.kind === 'growth' || entry.kind === 'health' ? null : timeOfDay(new Date(entry.millis));
  const meta = [showTime ? time : null, entry.detail].filter(Boolean).join(' · ');
  return (
    <View style={styles.wrap}>
      <PressableScale
        scaleTo={0.985}
        haptic={false}
        onPress={() => onPress(entry)}
        onLongPress={() => onOptions(entry)}
        delayLongPress={350}
        accessibilityHint="Tap to edit, long press for options"
        style={styles.row}
      >
        <IconTile name={entry.icon} tone={entry.tone} size={36} />
        <View style={styles.body}>
          <View style={styles.title}>
            <Text variant="bodyMedium" numberOfLines={1} style={{ flexShrink: 1 }}>
              {entry.title}
            </Text>
            {entry.running ? <Pill label="In progress" tone={entry.tone} /> : null}
          </View>
          {meta ? (
            <Text variant="footnote" color="textMuted">
              {meta}
            </Text>
          ) : null}
          {entry.notes ? (
            <Text variant="callout" color="textSecondary" numberOfLines={2} style={{ marginTop: 2 }}>
              {entry.notes}
            </Text>
          ) : null}
        </View>
      </PressableScale>
      <View style={styles.more}>
        <IconButton
          name="ellipsis-horizontal"
          variant="plain"
          size={30}
          color="textMuted"
          onPress={() => onOptions(entry)}
          accessibilityLabel={`Options for ${entry.title}`}
        />
      </View>
    </View>
  );
});

const makeStyles = (_: Theme) =>
  StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'flex-start' },
    row: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md, padding: SPACE.md, paddingLeft: SPACE.lg },
    more: { marginTop: SPACE.sm, marginRight: SPACE.sm },
    body: { flex: 1, gap: 2, paddingTop: 1 },
    title: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  });
