import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme, SPACE, RADIUS } from '../../context/ThemeContext';
import type { ThemeColors } from '../../context/ThemeContext';
import { Text } from '../ui';

export interface DayBar {
  label: string;
  value: number;
}

const HEIGHT = 96;

/**
 * A small, themed bar chart for "per day" counts (e.g. kicks per day over the
 * last 7 days). Plain views, so it looks the same on iOS, Android and web.
 */
export const DayBars = memo(function DayBars({
  bars,
  color = 'plum',
  accessibilityLabel,
}: {
  bars: DayBar[];
  color?: keyof ThemeColors;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <View style={styles.row} accessible accessibilityLabel={accessibilityLabel}>
      {bars.map((b, i) => (
        <View key={i} style={styles.col}>
          <Text variant="caption" color={b.value ? 'textSecondary' : 'textMuted'} tabular>
            {b.value}
          </Text>
          <View style={[styles.track, { backgroundColor: colors.surfaceSecondary }]}>
            <View style={[styles.fill, { height: `${(b.value / max) * 100}%`, backgroundColor: colors[color] as string }]} />
          </View>
          <Text variant="caption" color="textMuted">
            {b.label}
          </Text>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: SPACE.sm, alignItems: 'flex-end' },
  col: { flex: 1, alignItems: 'center', gap: SPACE.xs },
  track: { width: '70%', maxWidth: 28, height: HEIGHT, borderRadius: RADIUS.sm, justifyContent: 'flex-end', overflow: 'hidden' },
  fill: { width: '100%', borderRadius: RADIUS.sm },
});
