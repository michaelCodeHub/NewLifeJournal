import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, IconName } from '../ui/Icon';
import { Theme, useThemedStyles, RADIUS, SPACE } from '../../context/ThemeContext';
import { IconTile, Text, Tone } from '../ui';

interface CountItem {
  icon: IconName;
  tone: Tone;
  count: number;
  label: string;
}

/** Three-up stat strip: visits / symptoms / milestones. */
export const JournalCounts = memo(function JournalCounts({
  visits,
  symptoms,
  milestones,
}: {
  visits: number;
  symptoms: number;
  milestones: number;
}) {
  const styles = useThemedStyles(makeStyles);
  const items: CountItem[] = [
    { icon: 'medkit-outline', tone: 'green', count: visits, label: visits === 1 ? 'Visit' : 'Visits' },
    { icon: 'thermometer-outline', tone: 'orange', count: symptoms, label: symptoms === 1 ? 'Symptom' : 'Symptoms' },
    { icon: 'star-outline', tone: 'gold', count: milestones, label: milestones === 1 ? 'Milestone' : 'Milestones' },
  ];
  return (
    <View style={styles.row}>
      {items.map((it) => (
        <View key={it.label} style={styles.cell} accessible accessibilityLabel={`${it.count} ${it.label}`}>
          <IconTile name={it.icon} tone={it.tone} size={28} />
          <Text variant="title2" tabular>
            {it.count}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {it.label}
          </Text>
        </View>
      ))}
    </View>
  );
});

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: SPACE.sm },
    cell: {
      flex: 1,
      gap: SPACE.xs,
      padding: SPACE.md,
      borderRadius: RADIUS.md,
      backgroundColor: colors.surfaceSecondary,
    },
  });
