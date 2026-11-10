import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { usePregnancy } from '../../context/PregnancyContext';
import { Theme, useThemedStyles, useTheme, SPACE, RADIUS } from '../../context/ThemeContext';
import {
  Button,
  Card,
  Chip,
  ConfirmSheet,
  DateField,
  EmptyState,
  FieldLabel,
  HeaderAction,
  IconButton,
  IconTile,
  Pill,
  PressableScale,
  Screen,
  ScreenState,
  SectionHeader,
  Sheet,
  Text,
  TextField,
  TONES,
  useToast,
} from '../../components/ui';
import { longDate, SEVERITY, SYMPTOM_TYPES, symptomDbType, symptomIcon, symptomTitle } from '../../lib/journal';
import type { Symptom } from '../../types';

type Severity = 1 | 2 | 3 | 4 | 5;

export default function SymptomsScreen() {
  const params = useLocalSearchParams<{ add?: string; edit?: string }>();
  const toast = useToast();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { pregnancy, symptoms, loading, addSymptom, updateSymptom, deleteSymptom, getCurrentWeek } = usePregnancy();

  const [formOpen, setFormOpen] = useState(false);
  const [label, setLabel] = useState<string>('Nausea');
  const [custom, setCustom] = useState('');
  const [severity, setSeverity] = useState<Severity>(2);
  const [date, setDate] = useState(() => new Date());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [toDelete, setToDelete] = useState<Symptom | null>(null);
  /** The symptom being edited; null while logging a new one. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const openedFromParams = useRef(false);

  useEffect(() => {
    if (params.add === '1') setFormOpen(true);
  }, [params.add]);

  // Most-logged symptoms this pregnancy, for a quick overview.
  const top = useMemo(() => {
    const counts = new Map<string, { s: Symptom; n: number }>();
    for (const s of symptoms) {
      const k = symptomTitle(s);
      const c = counts.get(k);
      if (c) c.n += 1;
      else counts.set(k, { s, n: 1 });
    }
    // Only worth showing once something has come back; three "1× logged" tiles are noise.
    return [...counts.values()].filter((c) => c.n > 1).sort((a, b) => b.n - a.n).slice(0, 3);
  }, [symptoms]);

  const openAdd = () => {
    if (editingId) reset();
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (s: Symptom) => {
    const title = symptomTitle(s);
    const known = SYMPTOM_TYPES.find((t) => t.label.toLowerCase() === title.toLowerCase() && t.label !== 'Other');
    setLabel(known ? known.label : 'Other');
    setCustom(known ? '' : title);
    setSeverity(s.severity);
    setDate(s.date.toDate());
    setNotes(s.notes ?? '');
    setError(undefined);
    setEditingId(s.id);
    setFormOpen(true);
  };

  // Timeline's "Edit" opens this screen with ?edit=<id>.
  useEffect(() => {
    if (!params.edit || openedFromParams.current) return;
    const s = symptoms.find((x) => x.id === params.edit);
    if (s) {
      openedFromParams.current = true;
      openEdit(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.edit, symptoms]);

  const reset = () => {
    setLabel('Nausea');
    setCustom('');
    setSeverity(2);
    setDate(new Date());
    setNotes('');
    setError(undefined);
  };

  const save = async () => {
    const finalLabel = label === 'Other' ? custom.trim() : label;
    if (!finalLabel) {
      setError('Describe the symptom');
      return;
    }
    setSaving(true);
    const data = {
      date,
      type: symptomDbType(finalLabel),
      label: finalLabel,
      severity,
      notes: notes.trim() || undefined,
    };
    try {
      if (editingId) await updateSymptom(editingId, data);
      else await addSymptom(data);
      setFormOpen(false);
      reset();
      setEditingId(null);
      toast.show(editingId ? 'Symptom updated' : 'Symptom logged');
    } catch (e: any) {
      toast.show(e?.message || 'Could not save symptom', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ScreenState loading />;
  if (!pregnancy) return <ScreenState icon="leaf-outline" title="No active pregnancy" />;

  const week = getCurrentWeek();

  return (
    <Screen
      header={{
        variant: 'bar',
        title: 'Symptoms',
        right: <HeaderAction name="add" onPress={openAdd} accessibilityLabel="Log symptom" />,
      }}
      contentStyle={{ paddingTop: SPACE.lg }}
    >
      {top.length > 0 ? (
        <View>
          <SectionHeader title="Most logged" />
          <View style={styles.topRow}>
            {top.map(({ s, n }) => (
              <Card key={symptomTitle(s)} style={styles.topCard}>
                <IconTile name={symptomIcon(s)} tone="orange" size={30} />
                <Text variant="calloutMedium" numberOfLines={1}>
                  {symptomTitle(s)}
                </Text>
                <Text variant="caption" color="textMuted">
                  {n}× logged
                </Text>
              </Card>
            ))}
          </View>
        </View>
      ) : null}

      {symptoms.length === 0 ? (
        <Card>
          <EmptyState
            icon="thermometer-outline"
            tone="orange"
            title="Nothing logged yet"
            body="Tracking how you feel helps you spot patterns and gives your doctor a clear picture."
            action={<Button title="Log a symptom" icon="add" onPress={openAdd} />}
          />
        </Card>
      ) : (
        <View>
          <SectionHeader title="History" />
          <Card padded={false}>
            {symptoms.map((s, i) => {
              const sev = SEVERITY[s.severity];
              return (
                <View key={s.id ?? i} style={[styles.row, i < symptoms.length - 1 && styles.divider]}>
                  {/* Tap to edit; delete stays a separate sibling so web never nests buttons. */}
                  <PressableScale
                    scaleTo={0.985}
                    onPress={() => openEdit(s)}
                    accessibilityLabel={`Edit ${symptomTitle(s)}`}
                    style={styles.rowMain}
                  >
                  <IconTile name={symptomIcon(s)} tone="orange" size={34} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.titleRow}>
                      <Text variant="bodyMedium" numberOfLines={1} style={{ flexShrink: 1 }}>
                        {symptomTitle(s)}
                      </Text>
                      <Pill label={sev.label} tone={sev.tone} />
                    </View>
                    <Text variant="footnote" color="textMuted">
                      {longDate(s.date.toDate())} · Week {s.week}
                    </Text>
                    {s.notes ? (
                      <Text variant="callout" color="textSecondary" numberOfLines={3}>
                        {s.notes}
                      </Text>
                    ) : null}
                  </View>
                  </PressableScale>
                  <IconButton
                    name="trash-outline"
                    variant="plain"
                    size={30}
                    color="textMuted"
                    onPress={() => setToDelete(s)}
                    accessibilityLabel={`Delete ${symptomTitle(s)}`}
                  />
                </View>
              );
            })}
          </Card>
        </View>
      )}

      <Sheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Edit symptom' : 'Log symptom'}
        subtitle={editingId ? undefined : `Week ${week}`}
        footer={<Button title={editingId ? 'Save changes' : 'Save symptom'} size="lg" fullWidth loading={saving} onPress={save} />}
      >
        <View style={{ gap: SPACE.sm }}>
          <FieldLabel label="What are you feeling?" />
          <View style={styles.chips}>
            {SYMPTOM_TYPES.map((t) => (
              <Chip
                key={t.label}
                label={t.label}
                selected={label === t.label}
                onPress={() => {
                  setLabel(t.label);
                  setError(undefined);
                }}
              />
            ))}
          </View>
        </View>
        {label === 'Other' ? (
          <TextField label="Describe it" placeholder="e.g. Round ligament pain" value={custom} onChangeText={setCustom} error={error} autoFocus />
        ) : null}

        <View style={{ gap: SPACE.sm }}>
          <FieldLabel label="How strong?" hint={SEVERITY[severity].label} />
          <View style={styles.severityRow}>
            {([1, 2, 3, 4, 5] as Severity[]).map((n) => {
              const active = severity === n;
              const t = TONES[SEVERITY[n].tone];
              return (
                <PressableScale
                  key={n}
                  haptic="selection"
                  scaleTo={0.92}
                  onPress={() => setSeverity(n)}
                  accessibilityLabel={`Severity ${n}, ${SEVERITY[n].label}`}
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.sevItem,
                    {
                      backgroundColor: active ? colors[t.bg] : colors.surface,
                      borderColor: active ? colors[t.fg] : colors.borderStrong,
                    },
                  ]}
                >
                  <Text variant="headline" color={active ? t.fg : 'textSecondary'}>
                    {n}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
          <View style={styles.sevLegend}>
            <Text variant="caption" color="textMuted">
              Mild
            </Text>
            <Text variant="caption" color="textMuted">
              Very severe
            </Text>
          </View>
        </View>

        <DateField label="When" value={date} onChange={setDate} maximumDate={new Date()} />
        <TextField label="Notes" optional placeholder="Anything that helped or made it worse?" multiline value={notes} onChangeText={setNotes} />
      </Sheet>

      <ConfirmSheet
        visible={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete this symptom?"
        body={toDelete ? `${symptomTitle(toDelete)} on ${longDate(toDelete.date.toDate())} will be removed.` : undefined}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await deleteSymptom(toDelete.id);
            toast.show('Symptom deleted');
          } catch (e: any) {
            toast.show(e?.message || 'Could not delete symptom', 'error');
          }
        }}
      />
    </Screen>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    topRow: { flexDirection: 'row', gap: SPACE.md },
    topCard: { flex: 1, gap: SPACE.sm, padding: SPACE.md },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm, padding: SPACE.md, paddingLeft: SPACE.lg },
    rowMain: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: colors.border },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
    severityRow: { flexDirection: 'row', gap: SPACE.sm },
    sevItem: {
      flex: 1,
      height: 38,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sevLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  });
