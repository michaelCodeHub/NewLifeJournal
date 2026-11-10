import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { usePregnancy } from '../../../context/PregnancyContext';
import { Theme, useThemedStyles, useTheme, SPACE, GUTTER, RADIUS } from '../../../context/ThemeContext';
import {
  Button,
  Card,
  ConfirmSheet,
  EmptyState,
  Header,
  HeaderAction,
  IconButton,
  IconTile,
  OptionSheet,
  Pill,
  PressableScale,
  ScreenState,
  SegmentedControl,
  Sheet,
  ListRow,
  Text,
  Tone,
  useToast,
} from '../../../components/ui';
import { SEVERITY, shortDate, symptomIcon, symptomTitle, visitIcon, visitTitle } from '../../../lib/journal';
import { MilestoneSheet } from '../../../components/MilestoneSheet';
import type { Milestone } from '../../../types';

type Filter = 'all' | 'visits' | 'symptoms';
type Kind = 'visit' | 'symptom' | 'milestone';

interface TimelineEvent {
  key: string;
  id: string;
  kind: Kind;
  millis: number;
  week: number;
  title: string;
  notes?: string;
  meta: string;
  icon: React.ComponentProps<typeof IconTile>['name'];
  tone: Tone;
  severity?: 1 | 2 | 3 | 4 | 5;
}

const KIND_TONE: Record<Kind, Tone> = { visit: 'green', symptom: 'orange', milestone: 'gold' };

const timeFmt = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** One row. Memoized so filtering or deleting doesn't re-render every card. */
const EventRow = memo(function EventRow({
  event,
  onLongPress,
  onPress,
}: {
  event: TimelineEvent;
  onLongPress: (e: TimelineEvent) => void;
  onPress: (e: TimelineEvent) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const sev = event.severity ? SEVERITY[event.severity] : null;
  // The options button sits beside (not inside) the pressable row, so the
  // web build doesn't nest one <button> in another.
  return (
    <View style={styles.rowWrap}>
      <PressableScale
        scaleTo={0.985}
        haptic={false}
        onPress={() => onPress(event)}
        onLongPress={() => onLongPress(event)}
        delayLongPress={350}
        accessibilityHint="Tap to edit, long press for options"
        style={styles.row}
      >
        <IconTile name={event.icon} tone={event.tone} size={36} />
        <View style={styles.rowBody}>
          <View style={styles.rowTitle}>
            <Text variant="bodyMedium" numberOfLines={1} style={{ flexShrink: 1 }}>
              {event.title}
            </Text>
            {sev ? <Pill label={sev.label} tone={sev.tone} /> : null}
          </View>
          <Text variant="footnote" color="textMuted">
            {event.meta}
          </Text>
          {event.notes ? (
            <Text variant="callout" color="textSecondary" numberOfLines={2} style={{ marginTop: 2 }}>
              {event.notes}
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
          onPress={() => onLongPress(event)}
          accessibilityLabel={`Options for ${event.title}`}
        />
      </View>
    </View>
  );
});

export default function TimelineScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { pregnancy, hospitalVisits, symptoms, milestones, loading, deleteHospitalVisit, deleteSymptom, deleteMilestone, getCurrentWeek } =
    usePregnancy();

  const [filter, setFilter] = useState<Filter>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [selected, setSelected] = useState<TimelineEvent | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const listRef = useRef<SectionList<TimelineEvent>>(null);

  // Build, sort and format once per data change — not on every render.
  const allEvents = useMemo<TimelineEvent[]>(() => {
    const out: TimelineEvent[] = [];
    for (const v of hospitalVisits) {
      const d = v.date.toDate();
      const extras = [v.weight ? `${v.weight} kg` : null, v.bloodPressure ? `BP ${v.bloodPressure}` : null].filter(Boolean);
      out.push({
        key: `v-${v.id}`,
        id: v.id,
        kind: 'visit',
        millis: d.getTime(),
        week: v.week,
        title: visitTitle(v),
        notes: v.notes,
        meta: [shortDate(d), timeFmt(d), ...extras].join(' · '),
        icon: visitIcon(v),
        tone: KIND_TONE.visit,
      });
    }
    for (const s of symptoms) {
      const d = s.date.toDate();
      out.push({
        key: `s-${s.id}`,
        id: s.id,
        kind: 'symptom',
        millis: d.getTime(),
        week: s.week,
        title: symptomTitle(s),
        notes: s.notes,
        meta: `${shortDate(d)} · ${timeFmt(d)}`,
        icon: symptomIcon(s),
        tone: KIND_TONE.symptom,
        severity: s.severity,
      });
    }
    for (const m of milestones) {
      const d = m.date.toDate();
      out.push({
        key: `m-${m.id ?? d.getTime()}`,
        id: m.id,
        kind: 'milestone',
        millis: d.getTime(),
        week: m.week,
        title: m.title,
        notes: m.description,
        meta: shortDate(d),
        icon: 'star-outline',
        tone: KIND_TONE.milestone,
      });
    }
    return out.sort((a, b) => b.millis - a.millis);
  }, [hospitalVisits, symptoms, milestones]);

  const sections = useMemo(() => {
    const filtered = allEvents.filter((e) =>
      filter === 'all' ? true : filter === 'visits' ? e.kind === 'visit' : e.kind === 'symptom'
    );
    const byWeek = new Map<number, TimelineEvent[]>();
    for (const e of filtered) {
      const list = byWeek.get(e.week);
      if (list) list.push(e);
      else byWeek.set(e.week, [e]);
    }
    return [...byWeek.entries()].sort((a, b) => b[0] - a[0]).map(([week, data]) => ({ week, data }));
  }, [allEvents, filter]);

  const onLongPress = useCallback((e: TimelineEvent) => {
    setSelected(e);
  }, []);

  // Visits and symptoms are edited on their own screens (same form as adding);
  // milestones in the milestone sheet.
  const editEvent = useCallback(
    (e: TimelineEvent) => {
      if (e.kind === 'visit') router.push({ pathname: '/(pregnancy)/visits', params: { edit: e.id } });
      else if (e.kind === 'symptom') router.push({ pathname: '/(pregnancy)/symptoms', params: { edit: e.id } });
      else {
        setEditingMilestone(milestones.find((m) => m.id === e.id) ?? null);
        setMilestoneOpen(true);
      }
    },
    [router, milestones]
  );

  const jumpToWeek = useCallback(
    (weekStr: string) => {
      const idx = sections.findIndex((s) => String(s.week) === weekStr);
      if (idx >= 0) {
        listRef.current?.scrollToLocation({ sectionIndex: idx, itemIndex: 0, viewOffset: 48, animated: true });
      }
    },
    [sections]
  );

  if (loading) return <ScreenState loading />;
  if (!pregnancy) return <ScreenState icon="leaf-outline" title="No active pregnancy" />;

  const currentWeek = getCurrentWeek();

  const listHeader = (
    <View style={styles.listHeader}>
      <SegmentedControl<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All' },
          { value: 'visits', label: 'Visits' },
          { value: 'symptoms', label: 'Symptoms' },
        ]}
      />
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header
        title="Timeline"
        right={
          <>
            {sections.length > 1 ? (
              <HeaderAction name="calendar-number-outline" onPress={() => setWeekPickerOpen(true)} accessibilityLabel="Jump to week" />
            ) : null}
            <HeaderAction name="add" onPress={() => setAddOpen(true)} accessibilityLabel="Add entry" />
          </>
        }
      />
      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={(e) => e.key}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        windowSize={11}
        onScrollToIndexFailed={() => {}}
        renderSectionHeader={({ section }) => (
          <View style={styles.weekHeader}>
            <Text variant="overline" color={section.week === currentWeek ? 'primaryDark' : 'textMuted'}>
              Week {section.week}
              {section.week === currentWeek ? ' · This week' : ''}
            </Text>
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
            <EventRow event={item} onLongPress={onLongPress} onPress={editEvent} />
          </View>
        )}
        ListEmptyComponent={
          <Card style={{ marginTop: SPACE.lg }}>
            <EmptyState
              icon="calendar-clear-outline"
              title={filter === 'all' ? 'Your story starts here' : `No ${filter} yet`}
              body="Log symptoms and hospital visits and they'll appear here, grouped by week."
              action={<Button title="Add your first entry" icon="add" onPress={() => setAddOpen(true)} />}
            />
          </Card>
        }
      />

      {/* Add entry */}
      <Sheet visible={addOpen} onClose={() => setAddOpen(false)} title="Add to timeline">
        <Card padded={false}>
          <ListRow
            icon="thermometer-outline"
            tone="orange"
            title="Log a symptom"
            subtitle="Nausea, fatigue, back pain…"
            onPress={() => {
              setAddOpen(false);
              router.push({ pathname: '/(pregnancy)/symptoms', params: { add: '1' } });
            }}
          />
          <ListRow
            icon="medkit-outline"
            tone="green"
            title="Add a hospital visit"
            subtitle="Checkups, scans and tests"
            onPress={() => {
              setAddOpen(false);
              router.push({ pathname: '/(pregnancy)/visits', params: { add: '1' } });
            }}
          />
          <ListRow
            icon="star-outline"
            tone="gold"
            title="Add a milestone"
            subtitle="First kick, baby shower, special moments"
            last
            onPress={() => {
              setAddOpen(false);
              // Let the first sheet finish closing before the next one opens.
              setTimeout(() => setMilestoneOpen(true), 300);
            }}
          />
        </Card>
      </Sheet>

      <MilestoneSheet
        visible={milestoneOpen}
        milestone={editingMilestone}
        onClose={() => {
          setMilestoneOpen(false);
          setEditingMilestone(null);
        }}
      />

      {/* Jump to week */}
      <OptionSheet
        visible={weekPickerOpen}
        onClose={() => setWeekPickerOpen(false)}
        title="Jump to week"
        options={sections.map((s) => ({
          value: String(s.week),
          label: `Week ${s.week}`,
          description: `${s.data.length} ${s.data.length === 1 ? 'entry' : 'entries'}`,
        }))}
        onSelect={jumpToWeek}
      />

      {/* Entry options */}
      <Sheet visible={!!selected && !confirmDelete} onClose={() => setSelected(null)} title={selected?.title} subtitle={selected?.meta}>
        <Card padded={false}>
          <ListRow
            icon="create-outline"
            title="Edit entry"
            onPress={() => {
              const e = selected;
              setSelected(null);
              // Let this sheet close before the next screen or sheet opens.
              if (e) setTimeout(() => editEvent(e), e.kind === 'milestone' ? 300 : 0);
            }}
          />
          <ListRow
            icon="trash-outline"
            title="Delete entry"
            destructive
            last
            chevron={false}
            onPress={() => setConfirmDelete(true)}
          />
        </Card>
      </Sheet>

      <ConfirmSheet
        visible={confirmDelete}
        onClose={() => {
          setConfirmDelete(false);
          setSelected(null);
        }}
        title="Delete this entry?"
        body={selected ? `"${selected.title}" will be removed from your timeline.` : undefined}
        onConfirm={async () => {
          if (!selected) return;
          try {
            if (selected.kind === 'visit') await deleteHospitalVisit(selected.id);
            else if (selected.kind === 'symptom') await deleteSymptom(selected.id);
            else await deleteMilestone(selected.id);
            toast.show('Entry deleted');
          } catch (e: any) {
            toast.show(e?.message || 'Could not delete entry', 'error');
          }
        }}
      />
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    root: { flex: 1 },
    listContent: { paddingHorizontal: GUTTER, paddingBottom: SPACE.huge },
    listHeader: { gap: SPACE.lg, paddingTop: SPACE.sm, marginBottom: SPACE.sm },
    weekHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingTop: SPACE.xl, paddingBottom: SPACE.sm },
    // Each week is one soft-filled group (same as Card): no outline, hairline between rows.
    cardSlice: { backgroundColor: colors.card },
    cardTop: { borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg },
    cardBottom: { borderBottomLeftRadius: RADIUS.lg, borderBottomRightRadius: RADIUS.lg },
    cardDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    rowWrap: { flexDirection: 'row', alignItems: 'flex-start' },
    row: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md, padding: SPACE.md, paddingLeft: SPACE.lg },
    more: { marginTop: SPACE.sm, marginRight: SPACE.sm },
    rowBody: { flex: 1, gap: 2, paddingTop: 1 },
    rowTitle: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  });

