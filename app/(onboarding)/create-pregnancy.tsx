import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { usePregnancy } from '../../context/PregnancyContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { SPACE } from '../../context/ThemeContext';
import { Button, Card, DateField, Screen, SectionHeader, Text, TextField, useToast } from '../../components/ui';
import { calculatePregnancyWeek } from '../../services/firebase/pregnancyService';
import { trimesterLabel } from '../../lib/journal';
import { trackEvent } from '../../services/monitoring/analytics';

const inDays = (n: number) => new Date(Date.now() + n * 86400000);

export default function CreatePregnancyScreen() {
  const router = useRouter();
  const toast = useToast();
  const { createPregnancy } = usePregnancy();
  const { user, userProfile, refreshUserProfile } = useAuth();

  const [motherName, setMotherName] = useState(user?.displayName ?? '');
  const [dueDate, setDueDate] = useState(() => inDays(180));
  const [babyName, setBabyName] = useState('');
  const [hospital, setHospital] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const week = calculatePregnancyWeek(dueDate);

  const submit = async () => {
    if (!motherName.trim()) {
      setNameError('Tell us what to call you');
      return;
    }
    setSaving(true);
    try {
      await createPregnancy({
        motherName: motherName.trim(),
        dueDate,
        babyName: babyName.trim() || undefined,
        hospital: hospital.trim() || undefined,
        doctorName: doctorName.trim() || undefined,
        doctorPhone: doctorPhone.trim() || undefined,
      });
      if (!userProfile?.currentMode) trackEvent('onboarding_completed', { source: 'pregnancy' });
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), { currentMode: 'pregnancy' });
        await refreshUserProfile();
      }
      router.replace('/(pregnancy)/(tabs)/home');
    } catch (e: any) {
      toast.show(e?.message || 'Could not create your profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      header={{ variant: 'bar', title: 'Your pregnancy', hideBack: !router.canGoBack() }}
      contentStyle={{ paddingTop: SPACE.xl }}
      footer={
        <View style={{ paddingHorizontal: 20, paddingTop: SPACE.md, paddingBottom: SPACE.xxl }}>
          <Button title="Start my journal" size="lg" fullWidth loading={saving} onPress={submit} />
        </View>
      }
    >
      <View style={{ gap: SPACE.xs }}>
        <Text variant="title1">A few details</Text>
        <Text variant="callout" color="textSecondary">
          We use your due date to show what's happening each week.
        </Text>
      </View>

      <View>
        <SectionHeader title="About you" />
        <Card style={{ gap: SPACE.lg }}>
          <TextField
            label="Your name"
            placeholder="e.g. Maya"
            autoCapitalize="words"
            value={motherName}
            onChangeText={(t) => {
              setMotherName(t);
              setNameError(undefined);
            }}
            error={nameError}
          />
          <DateField label="Due date" value={dueDate} onChange={setDueDate} minimumDate={new Date()} maximumDate={inDays(300)} />
          <Text variant="footnote" color="primaryDark">
            That's week {week} · {trimesterLabel(week)}
          </Text>
          <TextField label="Baby's name" optional placeholder="If you've picked one" value={babyName} onChangeText={setBabyName} />
        </Card>
      </View>

      <View>
        <SectionHeader title="Care team" />
        <Card style={{ gap: SPACE.lg }}>
          <TextField label="Hospital or clinic" optional icon="business-outline" value={hospital} onChangeText={setHospital} />
          <TextField label="Doctor or midwife" optional icon="person-outline" value={doctorName} onChangeText={setDoctorName} />
          <TextField
            label="Their phone"
            optional
            icon="call-outline"
            keyboardType="phone-pad"
            value={doctorPhone}
            onChangeText={setDoctorPhone}
          />
        </Card>
      </View>
    </Screen>
  );
}
