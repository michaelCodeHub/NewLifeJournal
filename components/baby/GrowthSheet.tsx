import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { useBaby } from '../../context/BabyContext';
import { SPACE } from '../../context/ThemeContext';
import { Button, DateField, Sheet, Text, TextField, useToast } from '../ui';
import { parseAmount } from '../../lib/baby';
import type { GrowthRecord } from '../../types';

/** Plausible ranges for 0–3 years; catches a typo like 75 kg instead of 7.5. */
const RANGE = { weight: [0.3, 25], height: [20, 110], head: [20, 60] } as const;
const inRange = (v: number | undefined, [lo, hi]: readonly [number, number]) => v === undefined || (v >= lo && v <= hi);

/** Log a growth measurement (F20): any of weight, length, head circumference. */
export function GrowthSheet({
  visible,
  onClose,
  record,
}: {
  visible: boolean;
  onClose: () => void;
  record?: GrowthRecord | null;
}) {
  const { baby, addGrowth, updateGrowth } = useBaby();
  const toast = useToast();
  const [date, setDate] = useState(new Date());
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [head, setHead] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDate(record ? record.date.toDate() : new Date());
    setWeight(record?.weightKg ? String(record.weightKg) : '');
    setHeight(record?.heightCm ? String(record.heightCm) : '');
    setHead(record?.headCm ? String(record.headCm) : '');
    setNotes(record?.notes ?? '');
  }, [visible, record]);

  const w = parseAmount(weight);
  const h = parseAmount(height);
  const hc = parseAmount(head);
  const empty = w === undefined && h === undefined && hc === undefined;
  const invalid = !inRange(w, RANGE.weight) || !inRange(h, RANGE.height) || !inRange(hc, RANGE.head);

  const save = async () => {
    if (empty || invalid) return;
    setSaving(true);
    try {
      const data = { date: Timestamp.fromDate(date), weightKg: w, heightCm: h, headCm: hc, notes: notes.trim() || undefined };
      if (record) await updateGrowth(record.id, data);
      else await addGrowth(data);
      toast.show(record ? 'Measurement updated' : 'Measurement saved');
      onClose();
    } catch {
      toast.show("Couldn't save the measurement. Try again.", 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={record ? 'Edit measurement' : 'Growth'}
      subtitle={record ? undefined : 'Fill in whatever was measured'}
      footer={<Button title="Save" size="lg" fullWidth loading={saving} disabled={empty || invalid} onPress={save} />}
    >
      <View style={{ gap: SPACE.lg }}>
        <DateField label="Date" value={date} onChange={setDate} maximumDate={new Date()} minimumDate={baby?.birthDate.toDate()} />
        <TextField
          label="Weight (kg)"
          optional
          keyboardType="decimal-pad"
          placeholder="4.2"
          value={weight}
          onChangeText={setWeight}
          error={inRange(w, RANGE.weight) ? undefined : 'Check the weight (kg)'}
        />
        <TextField
          label="Length (cm)"
          optional
          keyboardType="decimal-pad"
          placeholder="55"
          value={height}
          onChangeText={setHeight}
          error={inRange(h, RANGE.height) ? undefined : 'Check the length (cm)'}
        />
        <TextField
          label="Head circumference (cm)"
          optional
          keyboardType="decimal-pad"
          placeholder="37"
          value={head}
          onChangeText={setHead}
          error={inRange(hc, RANGE.head) ? undefined : 'Check the head size (cm)'}
        />
        <TextField label="Notes" optional placeholder="At the 6-week check" value={notes} onChangeText={setNotes} multiline maxLength={500} />
        {empty ? (
          <Text variant="footnote" color="textMuted">
            Enter at least one measurement.
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}
