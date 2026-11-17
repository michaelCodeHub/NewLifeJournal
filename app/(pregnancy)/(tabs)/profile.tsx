import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { usePregnancy } from '../../../context/PregnancyContext';
import { useBaby } from '../../../context/BabyContext';
import { SPACE } from '../../../context/ThemeContext';
import { Card, ConfirmSheet, ListRow, Screen, SectionHeader, useToast } from '../../../components/ui';
import { AccountSections, ProfileHeader } from '../../../components/profile/ProfileParts';
import { ageLabel } from '../../../lib/baby';
import { longDate, trimesterLabel } from '../../../lib/journal';
import type { IconName } from '../../../components/ui/Icon';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, setCurrentMode } = useAuth();
  const { pregnancy, getCurrentWeek, getDaysUntilDue, isCompleted, undoBabyArrived } = usePregnancy();
  const { babies, selectBaby } = useBaby();
  const [confirmUndo, setConfirmUndo] = useState(false);
  const toast = useToast();

  const displayName = pregnancy?.motherName || user?.displayName || 'You';
  const week = getCurrentWeek();

  const openBaby = async (id: string) => {
    selectBaby(id);
    await setCurrentMode('baby');
    router.replace('/(baby)/(tabs)/home');
  };

  return (
    <Screen header={{ title: 'Profile' }}>
      <ProfileHeader displayName={displayName} />

      {pregnancy ? (
        <View>
          <SectionHeader title="Pregnancy" action="Edit" onAction={() => router.push('/(pregnancy)/editpregnancy')} />
          <Card padded={false}>
            {(
              [
                isCompleted
                  ? ['baby-outline', 'Born', pregnancy.birthDate ? longDate(pregnancy.birthDate.toDate()) : `Week ${week}`]
                  : ['calendar-outline', 'Current week', `Week ${week} · ${trimesterLabel(week)}`],
                ['flag-outline', 'Due date', longDate(pregnancy.dueDate.toDate())],
                ['hourglass-outline', 'Days to go', isCompleted ? undefined : String(Math.max(0, getDaysUntilDue()))],
                ['heart-outline', 'Baby', pregnancy.babyName],
                ['person-outline', 'Doctor', pregnancy.doctorName],
                ['business-outline', 'Hospital', pregnancy.hospital],
              ] as [IconName, string, string | undefined][]
            )
              .filter(([, , value]) => !!value)
              .map(([icon, title, value], i, rows) => (
                <ListRow key={title} icon={icon} title={title} value={value} last={i === rows.length - 1} />
              ))}
          </Card>
          <Card padded={false} style={{ marginTop: SPACE.md }}>
            {isCompleted ? (
              <>
                {pregnancy.transitionedToBabyId ? null : (
                  <ListRow icon="happy-outline" tone="plum" title="Set up your baby's profile" onPress={() => router.push('/(pregnancy)/arrived')} />
                )}
                <ListRow icon="add-circle-outline" title="Start a new pregnancy" onPress={() => router.push('/(onboarding)/create-pregnancy')} />
                <ListRow icon="arrow-undo-outline" title="Undo “Baby has arrived”" chevron={false} last onPress={() => setConfirmUndo(true)} />
              </>
            ) : (
              <ListRow icon="heart-outline" tone="plum" title="Baby has arrived" last onPress={() => router.push('/(pregnancy)/arrived')} />
            )}
          </Card>
        </View>
      ) : null}

      {babies.length ? (
        <View>
          <SectionHeader title={babies.length === 1 ? 'Your baby' : 'Your babies'} />
          <Card padded={false}>
            {babies.map((b, i) => (
              <ListRow
                key={b.id}
                icon="happy-outline"
                tone="plum"
                title={b.name}
                subtitle={ageLabel(b.birthDate.toDate())}
                value="Open"
                onPress={() => openBaby(b.id)}
                last={i === babies.length - 1}
              />
            ))}
          </Card>
        </View>
      ) : null}

      <AccountSections
        appRows={
          <>
            <ListRow icon="notifications-outline" tone="neutral" title="Reminders" onPress={() => router.push('/(pregnancy)/notifications')} />
            <ListRow icon="download-outline" tone="neutral" title="Export my data" onPress={() => router.push('/(pregnancy)/export')} />
          </>
        }
      />

      <ConfirmSheet
        visible={confirmUndo}
        onClose={() => setConfirmUndo(false)}
        title="Undo “Baby has arrived”?"
        body="Your pregnancy becomes active again and the week count picks up from today. Your baby's profile, if you made one, is kept — remove it from the baby's Edit screen."
        confirmLabel="Undo"
        icon="arrow-undo-outline"
        onConfirm={async () => {
          try {
            await undoBabyArrived();
            toast.show('Pregnancy is active again');
          } catch {
            toast.show("Couldn't undo that. Try again.", 'error');
          }
        }}
      />
    </Screen>
  );
}
