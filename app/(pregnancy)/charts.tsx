import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { usePregnancy } from '../../context/PregnancyContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { SPACE } from '../../context/ThemeContext';
import PremiumGate from '../../components/PremiumGate';
import { Button, Card, ListRow, Screen, ScreenState, SectionHeader, SegmentedControl, Text } from '../../components/ui';
import { TrendChartCard, TrendDelta } from '../../components/insights/TrendChartCard';
import { getWeightDataPoints, getBPDataPoints, formatWeekLabel } from '../../utils/chartUtils';
import { longDate, shortDate } from '../../lib/journal';

type Metric = 'weight' | 'bp';

const MAX_READINGS = 6;

/** "+0.8" / "−1.2" / "0" with a typographic minus. */
const signed = (n: number, digits = 0) => {
  const abs = Math.abs(n).toFixed(digits);
  if (Number(abs) === 0) return '0';
  return `${n > 0 ? '+' : '−'}${abs}`;
};

const direction = (n: number): TrendDelta['direction'] => (n > 0 ? 'up' : n < 0 ? 'down' : 'flat');

export default function ChartsScreen() {
  const router = useRouter();
  const { pregnancy, hospitalVisits, loading } = usePregnancy();
  const { isPremium } = useSubscription();
  const [metric, setMetric] = useState<Metric>('weight');

  const weightPoints = useMemo(() => getWeightDataPoints(hospitalVisits), [hospitalVisits]);
  const bpPoints = useMemo(() => getBPDataPoints(hospitalVisits), [hospitalVisits]);

  const weight = useMemo(() => {
    const latest = weightPoints[weightPoints.length - 1];
    const prev = weightPoints[weightPoints.length - 2];
    const diff = latest && prev ? Math.round((latest.weight - prev.weight) * 10) / 10 : null;
    return {
      latest,
      delta:
        diff === null
          ? null
          : { label: diff === 0 ? 'No change' : `${signed(diff, 1)} kg`, direction: direction(diff) },
      labels: weightPoints.map((p) => formatWeekLabel(p.week)),
      series: [{ label: 'Weight', data: weightPoints.map((p) => p.weight), color: 'primaryDark' as const }],
    };
  }, [weightPoints]);

  const bp = useMemo(() => {
    const latest = bpPoints[bpPoints.length - 1];
    const prev = bpPoints[bpPoints.length - 2];
    let delta: TrendDelta | null = null;
    if (latest && prev) {
      const sys = latest.systolic - prev.systolic;
      const dia = latest.diastolic - prev.diastolic;
      delta =
        sys === 0 && dia === 0
          ? { label: 'No change', direction: 'flat' }
          : { label: `${signed(sys)}/${signed(dia)}`, direction: direction(sys !== 0 ? sys : dia) };
    }
    return {
      latest,
      delta,
      labels: bpPoints.map((p) => formatWeekLabel(p.week)),
      series: [
        { label: 'Systolic', data: bpPoints.map((p) => p.systolic), color: 'red' as const },
        { label: 'Diastolic', data: bpPoints.map((p) => p.diastolic), color: 'orange' as const },
      ],
    };
  }, [bpPoints]);

  const readings = useMemo(() => {
    if (metric === 'weight') {
      return [...weightPoints]
        .reverse()
        .slice(0, MAX_READINGS)
        .map((p) => ({ key: `w-${p.date.getTime()}`, value: `${p.weight.toFixed(1)} kg`, week: p.week, date: p.date }));
    }
    return [...bpPoints]
      .reverse()
      .slice(0, MAX_READINGS)
      .map((p) => ({ key: `bp-${p.date.getTime()}`, value: `${p.systolic}/${p.diastolic} mmHg`, week: p.week, date: p.date }));
  }, [metric, weightPoints, bpPoints]);

  const logVisit = useCallback(() => router.push('/(pregnancy)/visits?add=1'), [router]);

  if (!isPremium) {
    return (
      <PremiumGate
        title="Health charts"
        description="Track weight and blood pressure trends across your whole pregnancy with Plus."
        icon="stats-chart"
        preview="charts"
      >
        {null}
      </PremiumGate>
    );
  }

  if (loading) return <ScreenState loading />;
  if (!pregnancy) {
    return (
      <ScreenState icon="leaf-outline" title="No active pregnancy" body="Create a pregnancy profile to see your charts." />
    );
  }

  const logAction = <Button title="Log a visit" icon="add" variant="tinted" onPress={logVisit} />;

  return (
    <Screen header={{ variant: 'bar', title: 'Health charts' }} contentStyle={{ paddingTop: SPACE.lg }}>
      <SegmentedControl<Metric>
        value={metric}
        onChange={setMetric}
        options={[
          { value: 'weight', label: 'Weight' },
          { value: 'bp', label: 'Blood pressure' },
        ]}
      />

      {metric === 'weight' ? (
        <TrendChartCard
          title="Weight"
          icon="scale-outline"
          tone="teal"
          value={weight.latest ? weight.latest.weight.toFixed(1) : undefined}
          unit="kg"
          meta={weight.latest ? `Week ${weight.latest.week} · ${shortDate(weight.latest.date)}` : undefined}
          delta={weight.delta}
          labels={weight.labels}
          series={weight.series}
          decimalPlaces={1}
          emptyTitle="No weight readings yet"
          emptyBody="Add your weight when you log a hospital visit and your trend will appear here."
          emptyAction={logAction}
        />
      ) : (
        <TrendChartCard
          title="Blood pressure"
          icon="heart-outline"
          tone="red"
          value={bp.latest ? `${bp.latest.systolic}/${bp.latest.diastolic}` : undefined}
          unit="mmHg"
          meta={bp.latest ? `Week ${bp.latest.week} · ${shortDate(bp.latest.date)}` : undefined}
          delta={bp.delta}
          labels={bp.labels}
          series={bp.series}
          decimalPlaces={0}
          shadow={false}
          emptyTitle="No blood pressure readings yet"
          emptyBody="Add blood pressure when you log a hospital visit and your trend will appear here."
          emptyAction={logAction}
        />
      )}

      {readings.length > 0 ? (
        <View>
          <SectionHeader title="Recent readings" action="Log visit" onAction={logVisit} />
          <Card padded={false}>
            {readings.map((r, i) => (
              <ListRow
                key={r.key}
                title={r.value}
                subtitle={`Week ${r.week} · ${longDate(r.date)}`}
                last={i === readings.length - 1}
              />
            ))}
          </Card>
        </View>
      ) : null}

      <Text variant="footnote" color="textMuted" align="center">
        Readings come from weight and blood pressure logged at your hospital visits. Talk to your care team about
        anything that worries you.
      </Text>
    </Screen>
  );
}
