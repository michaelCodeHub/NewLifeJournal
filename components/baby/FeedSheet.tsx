import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { useBaby } from '../../context/BabyContext';
import { SPACE } from '../../context/ThemeContext';
import { Button, DateTimeField, SegmentedControl, Sheet, Text, TextField, useToast } from '../ui';
import { BREAST_SIDES, FEED_TYPES, formatMinutes, minutesBetween, mlToOz, ozToMl, parseAmount } from '../../lib/baby';
import { haptics } from '../../lib/haptics';
import type { BabyActivity, BreastSide, FeedType } from '../../types';

type Unit = 'ml' | 'oz';
type Mode = 'timer' | 'manual';

/**
 * Log a feed (F17): breast (side), bottle or solids, with an amount, and either
 * a live timer (start now, stop later — survives leaving the app) or a past
 * feed with start and end times. Pass `activity` to edit one.
 */
export function FeedSheet({
  visible,
  onClose,
  activity,
}: {
  visible: boolean;
  onClose: () => void;
  activity?: BabyActivity | null;
}) {
  const { addActivity, updateActivity, runningFeed } = useBaby();
  const toast = useToast();
  const editing = !!activity;

  const [feedType, setFeedType] = useState<FeedType>('breast');
  const [side, setSide] = useState<BreastSide>('left');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState<Unit>('ml');
  const [mode, setMode] = useState<Mode>('timer');
  const [start, setStart] = useState(new Date());
  const [end, setEnd] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const f = activity?.feeding;
    const now = new Date();
    setFeedType(f?.feedType ?? 'breast');
    setSide(f?.side ?? 'left');
    setUnit('ml');
    setAmount(f?.amountMl ? String(f.amountMl) : '');
    setMode(activity ? 'manual' : 'timer');
    setStart(activity ? activity.startedAt.toDate() : new Date(now.getTime() - 15 * 60000));
    setEnd(activity?.endedAt ? activity.endedAt.toDate() : now);
    setNotes(activity?.notes ?? '');
  }, [visible, activity]);

  const changeUnit = (u: Unit) => {
    const n = parseAmount(amount);
    if (n !== undefined && u !== unit) setAmount(String(u === 'oz' ? mlToOz(n) : ozToMl(n)));
    setUnit(u);
  };

  const running = editing && !activity?.endedAt;
  const timer = !editing && mode === 'timer';
  const amountN = parseAmount(amount);
  const amountMl = amountN === undefined ? undefined : unit === 'oz' ? ozToMl(amountN) : Math.round(amountN);
  const endBeforeStart = !timer && !running && end < start;

  const save = async () => {
    if (endBeforeStart) return;
    if (timer && runningFeed) {
      toast.show('A feed timer is already running', 'error');
      return;
    }
    setSaving(true);
    try {
      const data = {
        type: 'feeding' as const,
        startedAt: Timestamp.fromDate(timer ? new Date() : start),
        endedAt: timer || running ? undefined : Timestamp.fromDate(end),
        feeding: {
          feedType,
          ...(feedType === 'breast' ? { side } : {}),
          ...(feedType !== 'breast' && amountMl ? { amountMl } : {}),
        },
        notes: notes.trim() || undefined,
      };
      if (activity) await updateActivity(activity.id, data);
      else await addActivity(data);
      haptics.success();
      toast.show(timer ? 'Feed timer started' : editing ? 'Feed updated' : 'Feed logged');
      onClose();
    } catch {
      toast.show("Couldn't save the feed. Try again.", 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Edit feed' : 'Feed'}
      footer={
        <Button
          title={timer ? 'Start feed' : editing ? 'Save changes' : 'Save feed'}
          icon={timer ? 'play-outline' : undefined}
          size="lg"
          fullWidth
          loading={saving}
          disabled={endBeforeStart}
          onPress={save}
        />
      }
    >
      <View style={{ gap: SPACE.lg }}>
        <SegmentedControl<FeedType> value={feedType} onChange={setFeedType} options={FEED_TYPES} />

        {feedType === 'breast' ? (
          <View style={{ gap: SPACE.sm }}>
            <Text variant="footnote" color="textSecondary">
              Side
            </Text>
            <SegmentedControl<BreastSide> value={side} onChange={setSide} options={BREAST_SIDES} />
          </View>
        ) : (
          <View style={styles.amountRow}>
            <View style={{ flex: 1 }}>
              <TextField
                label="Amount"
                optional
                keyboardType="decimal-pad"
                placeholder={unit === 'ml' ? '120' : '4'}
                value={amount}
                onChangeText={setAmount}
              />
            </View>
            <View style={styles.unit}>
              <SegmentedControl<Unit>
                value={unit}
                onChange={changeUnit}
                options={[
                  { value: 'ml', label: 'ml' },
                  { value: 'oz', label: 'oz' },
                ]}
              />
            </View>
          </View>
        )}

        {editing ? null : (
          <SegmentedControl<Mode>
            value={mode}
            onChange={setMode}
            options={[
              { value: 'timer', label: 'Start timer' },
              { value: 'manual', label: 'Log past feed' },
            ]}
          />
        )}

        {timer ? (
          <Text variant="footnote" color="textSecondary">
            The timer keeps running if you leave the app. Stop it from Home when the feed ends.
          </Text>
        ) : (
          <>
            <DateTimeField label="Started" value={start} onChange={setStart} maximumDate={new Date()} />
            {running ? (
              <Text variant="footnote" color="textSecondary">
                This feed is still running — stop it from Home.
              </Text>
            ) : (
              <>
                <DateTimeField label="Ended" value={end} onChange={setEnd} maximumDate={new Date()} />
                <Text variant="footnote" color={endBeforeStart ? 'red' : 'textMuted'}>
                  {endBeforeStart ? 'The end time is before the start.' : `Duration ${formatMinutes(minutesBetween(start, end))}`}
                </Text>
              </>
            )}
          </>
        )}

        <TextField label="Notes" optional placeholder="Latched well, spit up…" value={notes} onChangeText={setNotes} multiline maxLength={500} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  amountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACE.md },
  unit: { width: 110, paddingBottom: 6 },
});
