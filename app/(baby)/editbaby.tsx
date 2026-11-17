import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useBaby } from '../../context/BabyContext';
import { useAuth } from '../../context/AuthContext';
import { usePregnancy } from '../../context/PregnancyContext';
import { SPACE, GUTTER } from '../../context/ThemeContext';
import { Button, Card, ConfirmSheet, ListRow, Screen, ScreenState, useToast } from '../../components/ui';
import { BabyForm, babyFormState, validateBabyForm } from '../../components/baby/BabyForm';

/** Edit the baby's details, or remove the profile and everything logged for it. */
export default function EditBabyScreen() {
  const router = useRouter();
  const toast = useToast();
  const { baby, babies, updateBaby, deleteBaby } = useBaby();
  const { setCurrentMode } = useAuth();
  const { pregnancy } = usePregnancy();
  const [form, setForm] = useState(() => babyFormState(baby));
  const [errors, setErrors] = useState<ReturnType<typeof validateBabyForm>['errors']>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setForm(babyFormState(baby));
  }, [baby?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!baby) return <ScreenState icon="happy-outline" title="No baby profile" />;

  const save = async () => {
    const { data, errors: e } = validateBabyForm(form);
    setErrors(e);
    if (!data) return;
    setSaving(true);
    try {
      await updateBaby(data);
      toast.show('Saved');
      router.back();
    } catch {
      toast.show("Couldn't save. Try again.", 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      const others = babies.filter((b) => b.id !== baby.id);
      await deleteBaby(baby.id);
      toast.show('Baby profile removed');
      if (others.length === 0) {
        // Nothing left in baby mode: back to the pregnancy journal, or setup.
        if (pregnancy) {
          await setCurrentMode('pregnancy');
          router.replace('/(pregnancy)/(tabs)/home');
        } else {
          router.replace('/(onboarding)/create-baby');
        }
      } else {
        router.back();
      }
    } catch {
      toast.show("Couldn't remove the profile. Try again.", 'error');
    }
  };

  return (
    <Screen
      header={{ variant: 'bar', title: 'Edit baby' }}
      contentStyle={{ paddingTop: SPACE.lg }}
      footer={
        <View style={{ paddingHorizontal: GUTTER, paddingTop: SPACE.md, paddingBottom: SPACE.xxl }}>
          <Button title="Save changes" size="lg" fullWidth loading={saving} onPress={save} />
        </View>
      }
    >
      <Card>
        <BabyForm value={form} onChange={setForm} errors={errors} />
      </Card>
      <Card padded={false}>
        <ListRow icon="trash-outline" title="Remove this baby profile" destructive chevron={false} last onPress={() => setConfirmDelete(true)} />
      </Card>
      <ConfirmSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Remove ${baby.name}'s profile?`}
        body="Every feed, diaper, sleep, measurement, health entry and chat for this baby is deleted. Your pregnancy journal is kept."
        confirmLabel="Remove"
        onConfirm={remove}
      />
    </Screen>
  );
}
