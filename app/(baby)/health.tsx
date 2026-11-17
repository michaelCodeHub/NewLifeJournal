import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useBaby } from '../../context/BabyContext';
import { SPACE, useTheme } from '../../context/ThemeContext';
import { Button, Card, Chip, EmptyState, HeaderAction, ListRow, Screen, ScreenState, SectionHeader } from '../../components/ui';
import { EntryRow, fromHealth } from '../../components/baby/entries';
import { useLogSheets } from '../../components/baby/useLogSheets';
import { useEntryOptions } from '../../components/baby/useEntryOptions';
import { healthIcon, healthTitle, HEALTH_TYPES } from '../../lib/baby';
import type { HealthEventType } from '../../types';

type Filter = 'all' | HealthEventType;

/** Vaccines, checkups, illnesses and medicines (F21), with what's coming up first. */
export default function HealthScreen() {
  const { colors } = useTheme();
  const { baby, health, loading } = useBaby();
  const { open, sheets } = useLogSheets();
  const options = useEntryOptions(open);
  const [filter, setFilter] = useState<Filter>('all');

  const upcoming = useMemo(() => {
    const now = Date.now();
    return health
      .filter((h) => h.nextDate && h.nextDate.toMillis() > now)
      .sort((a, b) => a.nextDate!.toMillis() - b.nextDate!.toMillis());
  }, [health]);
  const list = useMemo(() => health.filter((h) => filter === 'all' || h.type === filter).map(fromHealth), [health, filter]);

  if (loading) return <ScreenState loading />;
  if (!baby) return <ScreenState icon="happy-outline" title="Add your baby first" />;

  return (
    <Screen
      header={{
        variant: 'bar',
        title: 'Health & vaccines',
        right: <HeaderAction name="add" onPress={() => open({ kind: 'health' })} accessibilityLabel="Add health entry" />,
      }}
      contentStyle={{ paddingTop: SPACE.lg }}
    >
      {upcoming.length ? (
        <View>
          <SectionHeader title="Coming up" />
          <Card padded={false}>
            {upcoming.map((h, i) => (
              <ListRow
                key={h.id}
                icon={healthIcon(h.type)}
                tone="red"
                title={healthTitle(h)}
                subtitle={h.type === 'vaccine' ? 'Next dose' : 'Follow-up'}
                value={h.nextDate!.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                onPress={() => open({ kind: 'health', event: h })}
                last={i === upcoming.length - 1}
              />
            ))}
          </Card>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
        <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
        {HEALTH_TYPES.map((t) => (
          <Chip key={t.value} label={t.label} icon={t.icon} selected={filter === t.value} onPress={() => setFilter(t.value)} />
        ))}
      </View>

      <Card padded={false}>
        {list.length ? (
          list.map((e, i) => (
            <View key={e.key} style={i < list.length - 1 ? { borderBottomWidth: 0.5, borderBottomColor: colors.border } : undefined}>
              <EntryRow entry={e} showTime={false} onPress={(x) => open(x.target)} onOptions={options.show} />
            </View>
          ))
        ) : (
          <EmptyState
            icon="medical-outline"
            tone="red"
            title="Nothing recorded yet"
            body="Keep vaccines, checkups and medicines in one place for appointments."
            action={<Button title="Add entry" icon="add" onPress={() => open({ kind: 'health' })} />}
          />
        )}
      </Card>

      {sheets}
      {options.element}
    </Screen>
  );
}
