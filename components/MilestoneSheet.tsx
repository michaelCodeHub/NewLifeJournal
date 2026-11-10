import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { usePregnancy } from '../context/PregnancyContext';
import { SPACE } from '../context/ThemeContext';
import { Button, DateField, Sheet, TextField, useToast } from './ui';
import type { Milestone } from '../types';

/**
 * Add a special moment (first kick, gender reveal, baby shower…) to the
 * timeline, or edit one when `milestone` is passed.
 */
export function MilestoneSheet({
  visible,
  onClose,
  milestone,
}: {
  visible: boolean;
  onClose: () => void;
  milestone?: Milestone | null;
}) {
  const { addMilestone, updateMilestone } = usePregnancy();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [saving, setSaving] = useState(false);

  // Fresh form (or the milestone being edited) every time it opens.
  useEffect(() => {
    if (visible) {
      setTitle(milestone?.title ?? '');
      setNote(milestone?.description ?? '');
      setDate(milestone ? milestone.date.toDate() : new Date());
    }
  }, [visible, milestone]);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const data = { title: title.trim(), description: note.trim() || undefined, date };
      if (milestone) await updateMilestone(milestone.id, data);
      else await addMilestone(data);
      toast.show(milestone ? 'Milestone updated' : 'Milestone added');
      onClose();
    } catch {
      toast.show("Couldn't save the milestone. Try again.", 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={milestone ? 'Edit milestone' : 'Add a milestone'}
      subtitle={milestone ? undefined : 'A moment you want to remember'}
      footer={
        <Button
          title={milestone ? 'Save changes' : 'Save milestone'}
          size="lg"
          fullWidth
          loading={saving}
          disabled={!title.trim()}
          onPress={save}
        />
      }
    >
      <View style={{ gap: SPACE.lg }}>
        <TextField label="What happened?" placeholder="First kick, baby shower…" value={title} onChangeText={setTitle} maxLength={80} />
        <DateField label="Date" value={date} onChange={setDate} maximumDate={new Date()} />
        <TextField label="Note" optional placeholder="How it felt" value={note} onChangeText={setNote} multiline maxLength={500} />
      </View>
    </Sheet>
  );
}
