import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { usePregnancy } from '../context/PregnancyContext';
import { SPACE } from '../context/ThemeContext';
import { Button, DateField, Sheet, Text, useToast } from './ui';
import { haptics } from '../lib/haptics';

/**
 * "Baby has arrived": records the birth date and closes the pregnancy. The
 * journal stays readable afterwards, and Profile can undo it.
 */
export function BabyArrivedSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { pregnancy, markBabyArrived } = usePregnancy();
  const toast = useToast();
  const [date, setDate] = useState(() => new Date());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setDate(new Date());
  }, [visible]);

  const baby = pregnancy?.babyName?.trim();

  const save = async () => {
    setSaving(true);
    try {
      await markBabyArrived(date);
      haptics.success();
      toast.show(baby ? `Welcome, ${baby}` : 'Congratulations!', 'success');
      onClose();
    } catch {
      toast.show("Couldn't save that. Check your connection and try again.", 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={baby ? `${baby} has arrived` : 'Baby has arrived'}
      subtitle="Congratulations"
      footer={<Button title="Save birth date" size="lg" fullWidth loading={saving} onPress={save} />}
    >
      <View style={{ gap: SPACE.lg }}>
        <DateField label="Birth date" value={date} onChange={setDate} maximumDate={new Date()} />
        <Text variant="footnote" color="textSecondary">
          Your journal is kept exactly as it is, and the week count stops on this day. You can undo this from Profile.
        </Text>
      </View>
    </Sheet>
  );
}
