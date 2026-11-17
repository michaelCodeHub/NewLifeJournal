import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { useBaby } from '../../context/BabyContext';
import { SPACE } from '../../context/ThemeContext';
import { Button, Chip, DateField, Sheet, Text, TextField, useToast } from '../ui';
import { HEALTH_TYPES } from '../../lib/baby';
import type { HealthEvent, HealthEventType } from '../../types';

const PLACEHOLDER: Record<HealthEventType, string> = {
  vaccine: '6-in-1, rotavirus…',
  checkup: '6-week check',
  illness: 'Cold, fever…',
  medicine: 'Paracetamol 2.5 ml',
};

/** Vaccines, checkups, illnesses and medicines (F21), optionally with a follow-up date. */
export function HealthSheet({
  visible,
  onClose,
  event,
  initialType = 'vaccine',
}: {
  visible: boolean;
  onClose: () => void;
  event?: HealthEvent | null;
  initialType?: HealthEventType;
}) {
  const { baby, addHealth, updateHealth } = useBaby();
  const toast = useToast();
  const [type, setType] = useState<HealthEventType>(initialType);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [hasNext, setHasNext] = useState(false);
  const [nextDate, setNextDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setType(event?.type ?? initialType);
    setTitle(event?.title ?? '');
    setDate(event ? event.date.toDate() : new Date());
    setHasNext(!!event?.nextDate);
    setNextDate(event?.nextDate ? event.nextDate.toDate() : new Date(Date.now() + 56 * 86400000));
    setNotes(event?.notes ?? '');
  }, [visible, event, initialType]);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const data = {
        type,
        title: title.trim(),
        date: Timestamp.fromDate(date),
        nextDate: hasNext ? Timestamp.fromDate(nextDate) : undefined,
        notes: notes.trim() || undefined,
      };
      if (event) await updateHealth(event.id, data);
      else await addHealth(data);
      toast.show(event ? 'Updated' : 'Saved');
      onClose();
    } catch {
      toast.show("Couldn't save that. Try again.", 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={event ? 'Edit health entry' : 'Health'}
      footer={<Button title="Save" size="lg" fullWidth loading={saving} disabled={!title.trim()} onPress={save} />}
    >
      <View style={{ gap: SPACE.lg }}>
        <View style={styles.chips}>
          {HEALTH_TYPES.map((t) => (
            <Chip key={t.value} label={t.label} icon={t.icon} selected={type === t.value} onPress={() => setType(t.value)} />
          ))}
        </View>
        <TextField label="What" placeholder={PLACEHOLDER[type]} value={title} onChangeText={setTitle} maxLength={80} />
        <DateField label="Date" value={date} onChange={setDate} maximumDate={new Date()} minimumDate={baby?.birthDate.toDate()} />
        {hasNext ? (
          <View style={{ gap: SPACE.sm }}>
            <DateField label={type === 'vaccine' ? 'Next dose' : 'Follow-up'} value={nextDate} onChange={setNextDate} minimumDate={new Date()} />
            <Button title="Remove follow-up" variant="ghost" size="sm" onPress={() => setHasNext(false)} />
          </View>
        ) : (
          <Button
            title={type === 'vaccine' ? 'Add next dose date' : 'Add follow-up date'}
            icon="add"
            variant="secondary"
            size="sm"
            onPress={() => setHasNext(true)}
          />
        )}
        <TextField label="Notes" optional placeholder="Any reaction, dose, advice…" value={notes} onChangeText={setNotes} multiline maxLength={500} />
        <Text variant="footnote" color="textMuted">
          For records only — always follow your doctor's advice on medicines and doses.
        </Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
});
