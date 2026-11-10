import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { usePregnancy } from '../context/PregnancyContext';
import { SPACE } from '../context/ThemeContext';
import { Button, DateField, Sheet, TextField, useToast } from './ui';

/** Add a special moment (first kick, gender reveal, baby shower…) to the timeline. */
export function MilestoneSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { addMilestone } = usePregnancy();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [saving, setSaving] = useState(false);

  // Fresh form every time it opens.
  useEffect(() => {
    if (visible) {
      setTitle('');
      setNote('');
      setDate(new Date());
    }
  }, [visible]);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await addMilestone({ title: title.trim(), description: note.trim() || undefined, date });
      toast.show('Milestone added');
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
      title="Add a milestone"
      subtitle="A moment you want to remember"
      footer={<Button title="Save milestone" size="lg" fullWidth loading={saving} disabled={!title.trim()} onPress={save} />}
    >
      <View style={{ gap: SPACE.lg }}>
        <TextField label="What happened?" placeholder="First kick, baby shower…" value={title} onChangeText={setTitle} maxLength={80} />
        <DateField label="Date" value={date} onChange={setDate} maximumDate={new Date()} />
        <TextField label="Note" optional placeholder="How it felt" value={note} onChangeText={setNote} multiline maxLength={500} />
      </View>
    </Sheet>
  );
}
