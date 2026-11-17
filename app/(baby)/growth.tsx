import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useBaby } from '../../context/BabyContext';
import { SPACE, useTheme } from '../../context/ThemeContext';
import { Button, Card, HeaderAction, Screen, ScreenState, SectionHeader, SegmentedControl } from '../../components/ui';
import { TrendChartCard, TrendDelta } from '../../components/insights/TrendChartCard';
import { EntryRow, fromGrowth } from '../../components/baby/entries';
import { useLogSheets } from '../../components/baby/useLogSheets';
import { useEntryOptions } from '../../components/baby/useEntryOptions';
import { ageLabel } from '../../lib/baby';
import type { GrowthRecord } from '../../types';

type Metric = 'weightKg' | 'heightCm' | 'headCm';

const METRICS: { value: Metric; label: string; title: string; unit: string }[] = [
  { value: 'weightKg', label: 'Weight', title: 'Weight', unit: 'kg' },
  { value: 'heightCm', label: 'Length', title: 'Length', unit: 'cm' },
  { value: 'headCm', label: 'Head', title: 'Head circumference', unit: 'cm' },
];

const signed = (n: number) => {
  const abs = Math.abs(n).toFixed(1);
  return Number(abs) === 0 ? '0' : `${n > 0 ? '+' : '−'}${abs}`;
};
const direction = (n: number): TrendDelta['direction'] => (n > 0 ? 'up' : n < 0 ? 'down' : 'flat');

/** Growth records (F20): a trend per measurement, birth stats included, plus the list. */
export default function GrowthScreen() {
  const { baby, growth, loading } = useBaby();
  const { colors } = useTheme();
  const { open, sheets } = useLogSheets();
  const options = useEntryOptions(open);
  const [metric, setMetric] = useState<Metric>('weightKg');

  // Birth weight/length count as the first point, so the trend starts at birth.
  const points = useMemo(() => {
    if (!baby) return [];
    const rows: { date: Date; value: number }[] = growth
      .filter((g) => typeof g[metric] === 'number')
      .map((g) => ({ date: g.date.toDate(), value: g[metric] as number }));
    const birth = metric === 'weightKg' ? baby.birthWeight : metric === 'heightCm' ? baby.birthHeight : undefined;
    if (birth) rows.push({ date: baby.birthDate.toDate(), value: birth });
    return rows.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [baby, growth, metric]);

  if (loading) return <ScreenState loading />;
  if (!baby) return <ScreenState icon="happy-outline" title="Add your baby first" />;

  const m = METRICS.find((x) => x.value === metric)!;
  const latest = points[points.length - 1];
  const prev = points[points.length - 2];
  const birth = baby.birthDate.toDate();
  const recent = points.slice(-8);

  return (
    <Screen
      header={{
        variant: 'bar',
        title: 'Growth',
        right: <HeaderAction name="add" onPress={() => open({ kind: 'growth' })} accessibilityLabel="Add measurement" />,
      }}
      contentStyle={{ paddingTop: SPACE.lg }}
    >
      <SegmentedControl<Metric> value={metric} onChange={setMetric} options={METRICS} />

      <TrendChartCard
        title={m.title}
        icon="scale-outline"
        tone="green"
        value={latest ? String(latest.value) : undefined}
        unit={m.unit}
        meta={latest ? `${ageLabel(birth, latest.date)} · ${latest.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : undefined}
        delta={latest && prev ? { label: `${signed(latest.value - prev.value)} ${m.unit}`, direction: direction(latest.value - prev.value) } : null}
        labels={recent.map((p) => p.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}
        series={[{ label: m.title, data: recent.map((p) => p.value), color: 'green' }]}
        decimalPlaces={1}
        emptyTitle={`No ${m.label.toLowerCase()} measurements yet`}
        emptyBody="Add measurements from checkups and the trend appears here."
        emptyAction={<Button title="Add measurement" icon="add" onPress={() => open({ kind: 'growth' })} />}
      />

      {growth.length ? (
        <View>
          <SectionHeader title="All measurements" />
          <Card padded={false}>
            {growth.map((g: GrowthRecord, i) => {
              const e = fromGrowth(g);
              e.title = g.date.toDate().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
              return (
                <View key={e.key} style={i < growth.length - 1 ? { borderBottomWidth: 0.5, borderBottomColor: colors.border } : undefined}>
                  <EntryRow entry={e} onPress={(x) => open(x.target)} onOptions={options.show} />
                </View>
              );
            })}
          </Card>
        </View>
      ) : null}

      {sheets}
      {options.element}
    </Screen>
  );
}
