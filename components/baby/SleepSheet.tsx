import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { useBaby } from '../../context/BabyContext';
import { SPACE } from '../../context/ThemeContext';
import { Button, DateTimeField, SegmentedControl, Sheet, Text, TextField, useToast } from '../ui';
import { formatMinutes, minutesBetween } from '../../lib/baby';
import { haptics } from '../../lib/haptics';
import type { BabyActivity } from '../../types';

type Mode = 'timer' | 'manual';

/**
 * Log sleep (F19): start a live timer (stopped from Home; the start time is
 * stored, so it survives restarts) or enter a past nap with start and end.
 */
export function SleepSheet({
  visible,
  onClose,
  activity,
}: {
  visible: boolean;
  onClose: () => void;
  activity?: BabyActivity | null;
}) {
  const { addActivity, updateActivity, runningSleep } = useBaby();
  const toast = useToast();
  const editing = !!activity;
  const [mode, setMode] = useState<Mode>('timer');
  const [start, setStart] = useState(new Date());
  const [end, setEnd] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const now = new Date();
    setMode(activity ? 'manual' : 'timer');
    setStart(activity ? activity.startedAt.toDate() : new Date(now.getTime() - 60 * 60000));
    setEnd(activity?.endedAt ? activity.endedAt.toDate() : now);
    setNotes(activity?.notes ?? '');
  }, [visible, activity]);

  const running = editing && !activity?.endedAt;
  const timer = !editing && mode === 'timer';
  const endBeforeStart = !timer && !running && end < start;

  const save = async () => {
    if (endBeforeStart) return;
    if (timer && runningSleep) {
      toast.show('Baby is already asleep — stop that timer first', 'error');
      return;
    }
    setSaving(true);
    try {
      const data = {
        type: 'sleep' as const,
        startedAt: Timestamp.fromDate(timer ? new Date() : start),
        endedAt: timer || running ? undefined : Timestamp.fromDate(end),
        notes: notes.trim() || undefined,
      };
      if (activity) await updateActivity(activity.id, data);
      else await addActivity(data);
      haptics.success();
      toast.show(timer ? 'Sleep timer started' : editing ? 'Sleep updated' : 'Sleep logged');
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
      title={editing ? 'Edit sleep' : 'Sleep'}
      footer={
        <Button
          title={timer ? 'Baby is asleep' : editing ? 'Save changes' : 'Save sleep'}
          icon={timer ? 'moon-outline' : undefined}
          size="lg"
          fullWidth
          loading={saving}
          disabled={endBeforeStart}
          onPress={save}
        />
      }
    >
      <View style={{ gap: SPACE.lg }}>
        {editing ? null : (
          <SegmentedControl<Mode>
            value={mode}
            onChange={setMode}
            options={[
              { value: 'timer', label: 'Start timer' },
              { value: 'manual', label: 'Log past sleep' },
            ]}
          />
        )}
        {timer ? (
          <Text variant="footnote" color="textSecondary">
            Starts now. Tap "Woke up" on Home when baby wakes — the timer keeps going even if you close the app.
          </Text>
        ) : (
          <>
            <DateTimeField label="Fell asleep" value={start} onChange={setStart} maximumDate={new Date()} />
            {running ? (
              <Text variant="footnote" color="textSecondary">
                Still asleep — stop the timer from Home.
              </Text>
            ) : (
              <>
                <DateTimeField label="Woke up" value={end} onChange={setEnd} maximumDate={new Date()} />
                <Text variant="footnote" color={endBeforeStart ? 'red' : 'textMuted'}>
                  {endBeforeStart ? 'Woke up is before fell asleep.' : `Slept ${formatMinutes(minutesBetween(start, end))}`}
                </Text>
              </>
            )}
          </>
        )}
        <TextField label="Notes" optional placeholder="Nap in the pram…" value={notes} onChangeText={setNotes} multiline maxLength={500} />
      </View>
    </Sheet>
  );
}
