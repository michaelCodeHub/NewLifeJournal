import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { usePregnancy } from '../../context/PregnancyContext';
import { Theme, useThemedStyles, SPACE } from '../../context/ThemeContext';
import {
  Button,
  Card,
  ConfirmSheet,
  DateField,
  EmptyState,
  HeaderAction,
  IconButton,
  IconTile,
  OptionSheet,
  Pill,
  Screen,
  ScreenState,
  SectionHeader,
  SelectField,
  Sheet,
  Text,
  TextField,
  useToast,
} from '../../components/ui';
import { longDate, VISIT_TYPES, visitIcon, visitTitle } from '../../lib/journal';
import type { HospitalVisit } from '../../types';

const BP_PATTERN = /^\d{2,3}\s*\/\s*\d{2,3}$/;

export default function VisitsScreen() {
  const params = useLocalSearchParams<{ add?: string }>();
  const toast = useToast();
  const styles = useThemedStyles(makeStyles);
  const { pregnancy, hospitalVisits, loading, addHospitalVisit, deleteHospitalVisit } = usePregnancy();

  const [formOpen, setFormOpen] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [typeLabel, setTypeLabel] = useState<string>('Checkup');
  const [customType, setCustomType] = useState('');
  const [date, setDate] = useState(() => new Date());
  const [weight, setWeight] = useState('');
  const [bp, setBp] = useState('');
  const [notes, setNotes] = useState('');
  const [nextVisit, setNextVisit] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ type?: string; weight?: string; bp?: string }>({});
  const [toDelete, setToDelete] = useState<HospitalVisit | null>(null);

  useEffect(() => {
    if (params.add === '1') setFormOpen(true);
  }, [params.add]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return hospitalVisits
      .filter((v) => v.nextVisitDate && v.nextVisitDate.toMillis() > now)
      .sort((a, b) => a.nextVisitDate!.toMillis() - b.nextVisitDate!.toMillis())[0];
  }, [hospitalVisits]);

  const reset = () => {
    setTypeLabel('Checkup');
    setCustomType('');
    setDate(new Date());
    setWeight('');
    setBp('');
    setNotes('');
    setNextVisit(null);
    setErrors({});
  };

  const save = async () => {
    const label = typeLabel === 'Other' ? customType.trim() : typeLabel;
    const next: typeof errors = {};
    if (!label) next.type = 'Describe the visit type';
    const w = weight.trim() ? Number(weight.replace(',', '.')) : undefined;
    if (weight.trim() && (!Number.isFinite(w) || w! < 25 || w! > 250)) next.weight = 'Enter a weight in kg (25–250)';
    if (bp.trim() && !BP_PATTERN.test(bp.trim())) next.bp = 'Use the format 120/80';
    setErrors(next);
    if (Object.keys(next).length) return;

    const option = VISIT_TYPES.find((t) => t.label === typeLabel);
    setSaving(true);
    try {
      await addHospitalVisit({
        date,
        type: option?.db ?? 'checkup',
        label,
        weight: w,
        bloodPressure: bp.trim() ? bp.replace(/\s/g, '') : undefined,
        notes: notes.trim() || undefined,
        nextVisitDate: nextVisit ?? undefined,
      });
      setFormOpen(false);
      reset();
      toast.show('Visit saved');
    } catch (e: any) {
      toast.show(e?.message || 'Could not save visit', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ScreenState loading />;
  if (!pregnancy) return <ScreenState icon="leaf-outline" title="No active pregnancy" />;

  return (
    <Screen
      header={{
        variant: 'bar',
        title: 'Hospital visits',
        right: <HeaderAction name="add" onPress={() => setFormOpen(true)} accessibilityLabel="Add visit" />,
      }}
      contentStyle={{ paddingTop: SPACE.lg }}
    >
      {upcoming ? (
        <Card tone="tinted" tint="greenTint" style={styles.upcoming}>
          <IconTile name="calendar-outline" tone="green" size={36} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="green">
              Next appointment
            </Text>
            <Text variant="headline">{longDate(upcoming.nextVisitDate!.toDate())}</Text>
          </View>
        </Card>
      ) : null}

      {hospitalVisits.length === 0 ? (
        <Card>
          <EmptyState
            icon="medkit-outline"
            tone="green"
            title="No visits yet"
            body="Keep a record of checkups, scans and tests — weight and blood pressure become charts over time."
            action={<Button title="Add a visit" icon="add" onPress={() => setFormOpen(true)} />}
          />
        </Card>
      ) : (
        <View>
          <SectionHeader title="History" />
          <View style={{ gap: SPACE.md }}>
            {hospitalVisits.map((v) => (
              <Card key={v.id} style={styles.visit}>
                <View style={styles.visitTop}>
                  <IconTile name={visitIcon(v)} tone="green" size={36} />
                  <View style={{ flex: 1 }}>
                    <Text variant="headline" numberOfLines={1}>
                      {visitTitle(v)}
                    </Text>
                    <Text variant="footnote" color="textMuted">
                      {longDate(v.date.toDate())} · Week {v.week}
                    </Text>
                  </View>
                  <IconButton
                    name="trash-outline"
                    variant="plain"
                    size={30}
                    color="textMuted"
                    onPress={() => setToDelete(v)}
                    accessibilityLabel={`Delete ${visitTitle(v)}`}
                  />
                </View>
                {v.weight || v.bloodPressure ? (
                  <View style={styles.pills}>
                    {v.weight ? <Pill icon="scale-outline" label={`${v.weight} kg`} /> : null}
                    {v.bloodPressure ? <Pill icon="heart-outline" label={`BP ${v.bloodPressure}`} /> : null}
                  </View>
                ) : null}
                {v.notes ? (
                  <Text variant="callout" color="textSecondary">
                    {v.notes}
                  </Text>
                ) : null}
              </Card>
            ))}
          </View>
        </View>
      )}

      <Sheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title="Add visit"
        footer={<Button title="Save visit" size="lg" fullWidth loading={saving} onPress={save} />}
      >
        <SelectField label="Type" value={typeLabel} icon="medkit-outline" onPress={() => setTypePickerOpen(true)} />
        {typeLabel === 'Other' ? (
          <TextField
            label="Describe the visit"
            placeholder="e.g. Physiotherapy"
            value={customType}
            onChangeText={setCustomType}
            error={errors.type}
            autoFocus
          />
        ) : null}
        <DateField label="Date" value={date} onChange={setDate} maximumDate={new Date()} />
        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Weight"
              optional
              placeholder="kg"
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
              error={errors.weight}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Blood pressure"
              optional
              placeholder="120/80"
              keyboardType="numbers-and-punctuation"
              value={bp}
              onChangeText={setBp}
              error={errors.bp}
            />
          </View>
        </View>
        <TextField label="Notes" optional placeholder="What did the doctor say?" multiline value={notes} onChangeText={setNotes} />
        {nextVisit ? (
          <View style={{ gap: SPACE.xs }}>
            <DateField label="Next appointment" value={nextVisit} onChange={setNextVisit} minimumDate={new Date()} />
            <Button title="Remove next appointment" variant="ghost" size="sm" onPress={() => setNextVisit(null)} />
          </View>
        ) : (
          <Button
            title="Add next appointment"
            icon="calendar-outline"
            variant="tinted"
            onPress={() => setNextVisit(new Date(Date.now() + 14 * 86400000))}
          />
        )}
      </Sheet>

      <OptionSheet
        visible={typePickerOpen}
        onClose={() => setTypePickerOpen(false)}
        title="Visit type"
        value={typeLabel}
        options={VISIT_TYPES.map((t) => ({ value: t.label, label: t.label, icon: t.icon }))}
        onSelect={(v) => {
          setTypeLabel(v);
          setErrors((e) => ({ ...e, type: undefined }));
        }}
      />

      <ConfirmSheet
        visible={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete this visit?"
        body={toDelete ? `${visitTitle(toDelete)} on ${longDate(toDelete.date.toDate())} will be removed.` : undefined}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await deleteHospitalVisit(toDelete.id);
            toast.show('Visit deleted');
          } catch (e: any) {
            toast.show(e?.message || 'Could not delete visit', 'error');
          }
        }}
      />
    </Screen>
  );
}

const makeStyles = (_: Theme) =>
  StyleSheet.create({
    upcoming: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
    visit: { gap: SPACE.md },
    visitTop: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
    pills: { flexDirection: 'row', gap: SPACE.sm, flexWrap: 'wrap' },
    twoCol: { flexDirection: 'row', gap: SPACE.md },
  });
