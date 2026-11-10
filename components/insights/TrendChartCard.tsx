import React, { memo, useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Icon, IconName } from '../ui/Icon';
import { LineChart } from 'react-native-chart-kit';
import { ThemeColors, useTheme, SPACE } from '../../context/ThemeContext';
import { Card, EmptyState, IconTile, Pill, Text, Tone } from '../ui';
import { lineColor, thinLabels, useChartConfig } from './chartTheme';

export interface TrendSeries {
  label: string;
  data: number[];
  color: keyof ThemeColors;
}

export interface TrendDelta {
  label: string;
  direction: 'up' | 'down' | 'flat';
}

export interface TrendChartCardProps {
  title: string;
  icon: IconName;
  tone: Tone;
  /** Latest reading, already formatted (e.g. "68.4"). Omit when there is no data. */
  value?: string;
  unit?: string;
  /** Small caption under the value, e.g. "Week 24 · Mar 3". */
  meta?: string;
  delta?: TrendDelta | null;
  labels: string[];
  series: TrendSeries[];
  decimalPlaces?: number;
  /** Area fill under a single line. Off for multi-line charts. */
  shadow?: boolean;
  emptyTitle: string;
  emptyBody: string;
  /** Optional action under the empty state (e.g. "Log a visit"). */
  emptyAction?: React.ReactNode;
}

const CHART_HEIGHT = 200;
const DELTA_ICON: Record<TrendDelta['direction'], IconName> = {
  up: 'arrow-up',
  down: 'arrow-down',
  flat: 'remove',
};

/**
 * A metric card: title, big latest value with change vs the previous reading,
 * and a themed line chart. Shows an empty state until there are 2+ readings.
 */
export const TrendChartCard = memo(function TrendChartCard({
  title,
  icon,
  tone,
  value,
  unit,
  meta,
  delta,
  labels,
  series,
  decimalPlaces = 1,
  shadow = true,
  emptyTitle,
  emptyBody,
  emptyAction,
}: TrendChartCardProps) {
  const { colors } = useTheme();
  const chartConfig = useChartConfig(series[0]?.color ?? 'primaryDark', decimalPlaces);
  const [width, setWidth] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setWidth((prev) => (prev === w ? prev : w));
  }, []);

  const points = series[0]?.data.length ?? 0;

  const data = useMemo(
    () => ({
      labels: thinLabels(labels),
      datasets: series.map((s) => ({ data: s.data, color: lineColor(colors[s.color]), strokeWidth: 2 })),
    }),
    [labels, series, colors]
  );

  if (points === 0) {
    return (
      <Card>
        <EmptyState icon={icon} tone={tone} title={emptyTitle} body={emptyBody} action={emptyAction} />
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <IconTile name={icon} tone={tone} size={32} />
        <Text variant="headline" style={{ flex: 1 }} numberOfLines={1}>
          {title}
        </Text>
        {delta ? <Pill label={delta.label} icon={DELTA_ICON[delta.direction]} tone="neutral" /> : null}
      </View>

      {value ? (
        <View style={{ gap: SPACE.xxs }}>
          <View style={styles.valueRow}>
            <Text variant="number" tabular>
              {value}
            </Text>
            {unit ? (
              <Text variant="callout" color="textMuted">
                {unit}
              </Text>
            ) : null}
          </View>
          {meta ? (
            <Text variant="footnote" color="textMuted">
              {meta}
            </Text>
          ) : null}
        </View>
      ) : null}

      {points < 2 ? (
        <View style={styles.hint}>
          <Icon name="analytics-outline" size={16} color={colors.textMuted} />
          <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
            {emptyBody}
          </Text>
        </View>
      ) : (
        <View onLayout={onLayout} style={styles.chartWrap}>
          {width > 0 ? (
            <LineChart
              data={data}
              width={width}
              height={CHART_HEIGHT}
              chartConfig={chartConfig}
              bezier
              transparent
              withShadow={shadow}
              withOuterLines={false}
              withVerticalLines={false}
              segments={4}
              style={styles.chart}
            />
          ) : null}
        </View>
      )}

      {series.length > 1 && points >= 2 ? (
        <View style={styles.legend}>
          {series.map((s) => (
            <View key={s.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors[s.color] }]} />
              <Text variant="caption" color="textSecondary">
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { gap: SPACE.lg, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: SPACE.xs },
  hint: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  chartWrap: { minHeight: CHART_HEIGHT },
  // chart-kit reads style.paddingRight as the plot's LEFT inset: leave room for
  // half of the first week label so it isn't clipped.
  chart: { paddingRight: SPACE.md },
  legend: { flexDirection: 'row', gap: SPACE.lg, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs + 2 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
});
