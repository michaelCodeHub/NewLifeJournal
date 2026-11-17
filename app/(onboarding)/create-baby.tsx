import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useBaby } from '../../context/BabyContext';
import { useAuth } from '../../context/AuthContext';
import { trackEvent } from '../../services/monitoring/analytics';
import { SPACE, GUTTER } from '../../context/ThemeContext';
import { Button, Card, Screen, Text, useToast } from '../../components/ui';
import { BabyForm, babyFormState, validateBabyForm } from '../../components/baby/BabyForm';

/**
 * Baby setup (F06) for parents who start after the birth, or add another baby.
 * Parents coming from a pregnancy use "Baby has arrived" instead, which links
 * the two journals.
 */
export default function CreateBabyScreen() {
  const router = useRouter();
  const toast = useToast();
  const { createBaby } = useBaby();
  const { userProfile } = useAuth();
  const [form, setForm] = useState(() => babyFormState());
  const [errors, setErrors] = useState<ReturnType<typeof validateBabyForm>['errors']>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const { data, errors: e } = validateBabyForm(form);
    setErrors(e);
    if (!data) return;
    setSaving(true);
    try {
      const first = !userProfile?.currentMode;
      await createBaby(data);
      if (first) trackEvent('onboarding_completed', { source: 'baby' });
      router.replace('/(baby)/(tabs)/home');
    } catch (err: any) {
      toast.show(err?.message || "Couldn't save your baby's profile", 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      header={{ variant: 'bar', title: 'Your baby', hideBack: !router.canGoBack() }}
      contentStyle={{ paddingTop: SPACE.xl }}
      footer={
        <View style={{ paddingHorizontal: GUTTER, paddingTop: SPACE.md, paddingBottom: SPACE.xxl }}>
          <Button title="Start my baby's journal" size="lg" fullWidth loading={saving} onPress={submit} />
        </View>
      }
    >
      <View style={{ gap: SPACE.xs }}>
        <Text variant="title1">A few details</Text>
        <Text variant="callout" color="textSecondary">
          We use the birth date to show your baby's age and each day's feeds, diapers and sleep.
        </Text>
      </View>
      <Card>
        <BabyForm value={form} onChange={setForm} errors={errors} />
      </Card>
    </Screen>
  );
}
