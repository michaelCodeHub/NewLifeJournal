import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { usePregnancy } from '../../context/PregnancyContext';
import { useBaby } from '../../context/BabyContext';
import { SPACE, GUTTER } from '../../context/ThemeContext';
import { Button, Card, IconTile, Screen, ScreenState, Text, useToast } from '../../components/ui';
import { BabyForm, babyFormState, validateBabyForm } from '../../components/baby/BabyForm';
import { Confetti } from '../../components/baby/Confetti';
import { haptics } from '../../lib/haptics';

/**
 * "Your baby has arrived!" (F07): a celebration, then the baby's details. Saving
 * creates the baby linked to this pregnancy, closes the pregnancy and switches
 * the app to baby mode. The pregnancy journal stays readable from the baby's
 * Tools ("Before you were born").
 */
export default function ArrivedScreen() {
  const router = useRouter();
  const toast = useToast();
  const { pregnancy } = usePregnancy();
  const { welcomeBaby } = useBaby();
  const [form, setForm] = useState(() =>
    babyFormState(null, { name: pregnancy?.babyName ?? '', birthDate: pregnancy?.birthDate?.toDate() ?? new Date() })
  );
  const [errors, setErrors] = useState<ReturnType<typeof validateBabyForm>['errors']>({});
  const [saving, setSaving] = useState(false);

  if (!pregnancy) return <ScreenState icon="leaf-outline" title="No pregnancy to complete" />;

  const name = form.name.trim();

  const submit = async () => {
    const { data, errors: e } = validateBabyForm(form);
    setErrors(e);
    if (!data) return;
    setSaving(true);
    try {
      await welcomeBaby(pregnancy.id, data);
      haptics.success();
      router.replace('/(baby)/(tabs)/home');
    } catch {
      toast.show("Couldn't save that. Check your connection and try again.", 'error');
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen
        header={{ variant: 'bar', title: 'Baby has arrived' }}
        contentStyle={{ paddingTop: SPACE.xl }}
        footer={
          <View style={{ paddingHorizontal: GUTTER, paddingTop: SPACE.md, paddingBottom: SPACE.xxl }}>
            <Button title={name ? `Welcome ${name}` : 'Save'} icon="heart-outline" size="lg" fullWidth loading={saving} onPress={submit} />
          </View>
        }
      >
        <View style={styles.hero}>
          <Animated.View entering={ZoomIn.springify().damping(12)}>
            <IconTile name="sparkles-outline" tone="gold" size={72} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={{ alignItems: 'center', gap: SPACE.xs }}>
            <Text variant="display" align="center">
              Congratulations!
            </Text>
            <Text variant="callout" color="textSecondary" align="center">
              {name ? `Let's set up ${name}'s profile.` : "Let's set up your baby's profile."}
            </Text>
          </Animated.View>
        </View>

        <Card>
          <BabyForm value={form} onChange={setForm} errors={errors} />
        </Card>

        <Text variant="footnote" color="textMuted" align="center">
          Your pregnancy journal is kept exactly as it is, under "Before you were born".
        </Text>
      </Screen>
      <Confetti />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: SPACE.lg, paddingVertical: SPACE.md },
});
