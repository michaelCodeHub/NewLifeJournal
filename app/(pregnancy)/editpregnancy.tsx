import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { usePregnancy } from '../../context/PregnancyContext';
import { GUTTER, SPACE } from '../../context/ThemeContext';
import { Button, Card, DateField, Screen, ScreenState, SectionHeader, Text, TextField, useToast } from '../../components/ui';
import { calculatePregnancyWeek } from '../../services/firebase/pregnancyService';
import { trimesterLabel } from '../../lib/journal';
import type { Pregnancy } from '../../types';

const inDays = (n: number) => new Date(Date.now() + n * 86400000);
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** Edit what was entered at setup: name, due date, baby's name and care team. */
export default function EditPregnancyScreen() {
  const { pregnancy, loading } = usePregnancy();
  if (loading) return <ScreenState loading />;
  if (!pregnancy) return <ScreenState icon="leaf-outline" title="No pregnancy to edit" />;
  // Mount the form only once the pregnancy is loaded, so a refresh or deep link
  // never starts it with empty fields or a made-up due date.
  return <EditPregnancyForm key={pregnancy.id} pregnancy={pregnancy} />;
}

function EditPregnancyForm({ pregnancy }: { pregnancy: Pregnancy }) {
  const router = useRouter();
  const toast = useToast();
  const { isCompleted, updatePregnancyDetails } = usePregnancy();

  const [motherName, setMotherName] = useState(pregnancy.motherName ?? '');
  const [dueDate, setDueDate] = useState(() => pregnancy.dueDate.toDate());
  const [babyName, setBabyName] = useState(pregnancy.babyName ?? '');
  const [hospital, setHospital] = useState(pregnancy.hospital ?? '');
  const [doctorName, setDoctorName] = useState(pregnancy.doctorName ?? '');
  const [doctorPhone, setDoctorPhone] = useState(pregnancy.doctorPhone ?? '');
  const [nameError, setNameError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const originalDue = pregnancy.dueDate.toDate();
  const dueChanged = !sameDay(dueDate, originalDue);
  const week = calculatePregnancyWeek(dueDate);

  const save = async () => {
    if (!motherName.trim()) {
      setNameError('Tell us what to call you');
      return;
    }
    setSaving(true);
    try {
      await updatePregnancyDetails({
        motherName: motherName.trim(),
        // Keep the exact stored time when the day didn't change, so nothing re-weeks for no reason.
        dueDate: dueChanged ? dueDate : originalDue,
        babyName: babyName.trim() || undefined,
        hospital: hospital.trim() || undefined,
        doctorName: doctorName.trim() || undefined,
        doctorPhone: doctorPhone.trim() || undefined,
      });
      toast.show('Details saved');
      if (router.canGoBack()) router.back();
      else router.replace('/(pregnancy)/(tabs)/profile');
    } catch (e: any) {
      toast.show(e?.message || "Couldn't save your details. Try again.", 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      header={{ variant: 'bar', title: 'Edit details' }}
      contentStyle={{ paddingTop: SPACE.lg }}
      footer={
        <View style={{ paddingHorizontal: GUTTER, paddingTop: SPACE.md, paddingBottom: SPACE.xxl }}>
          <Button title="Save changes" size="lg" fullWidth loading={saving} onPress={save} />
        </View>
      }
    >
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
          <DateField
            label="Due date"
            value={dueDate}
            onChange={setDueDate}
            minimumDate={isCompleted ? undefined : inDays(-21)}
            maximumDate={inDays(300)}
          />
          {!isCompleted ? (
            <Text variant="footnote" color="primaryDark">
              That's week {week} · {trimesterLabel(week)}
            </Text>
          ) : null}
          {dueChanged ? (
            <Text variant="footnote" color="textSecondary">
              Your visits, symptoms and milestones will move to their new weeks.
            </Text>
          ) : null}
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
