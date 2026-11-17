import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { useBaby } from '../../context/BabyContext';
import { SPACE } from '../../context/ThemeContext';
import { Button, Chip, DateTimeField, SegmentedControl, Sheet, Text, TextField, useToast } from '../ui';
import { DIAPER_COLORS, DIAPER_KINDS } from '../../lib/baby';
import { haptics } from '../../lib/haptics';
import type { BabyActivity, DiaperColor, DiaperKind } from '../../types';

/**
 * Log a diaper change (F18). Built to take a few seconds: the type is the only
 * choice that matters, time defaults to now, colour and notes are optional.
 */
export function DiaperSheet({
  visible,
  onClose,
  activity,
}: {
  visible: boolean;
  onClose: () => void;
  activity?: BabyActivity | null;
}) {
  const { addActivity, updateActivity } = useBaby();
  const toast = useToast();
  const [kind, setKind] = useState<DiaperKind>('wet');
  const [color, setColor] = useState<DiaperColor | undefined>();
  const [when, setWhen] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setKind(activity?.diaper?.kind ?? 'wet');
    setColor(activity?.diaper?.color);
    setWhen(activity ? activity.startedAt.toDate() : new Date());
    setNotes(activity?.notes ?? '');
  }, [visible, activity]);

  const save = async () => {
    setSaving(true);
    try {
      const data = {
        type: 'diaper' as const,
        startedAt: Timestamp.fromDate(when),
        diaper: { kind, ...(kind !== 'wet' && color ? { color } : {}) },
        notes: notes.trim() || undefined,
      };
      if (activity) await updateActivity(activity.id, data);
      else await addActivity(data);
      haptics.success();
      toast.show(activity ? 'Diaper updated' : 'Diaper logged');
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
      title={activity ? 'Edit diaper' : 'Diaper'}
      footer={<Button title={activity ? 'Save changes' : 'Save'} size="lg" fullWidth loading={saving} onPress={save} />}
    >
      <View style={{ gap: SPACE.lg }}>
        <SegmentedControl<DiaperKind> value={kind} onChange={setKind} options={DIAPER_KINDS} />
        {kind !== 'wet' ? (
          <View style={{ gap: SPACE.sm }}>
            <Text variant="footnote" color="textSecondary">
              Colour (optional)
            </Text>
            <View style={styles.chips}>
              {DIAPER_COLORS.map((c) => (
                <Chip
                  key={c.value}
                  label={c.label}
                  selected={color === c.value}
                  onPress={() => setColor(color === c.value ? undefined : c.value)}
                />
              ))}
            </View>
          </View>
        ) : null}
        <DateTimeField label="When" value={when} onChange={setWhen} maximumDate={new Date()} />
        <TextField label="Notes" optional placeholder="Rash, very runny…" value={notes} onChangeText={setNotes} multiline maxLength={500} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
});
