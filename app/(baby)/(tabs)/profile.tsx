import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { usePregnancy } from '../../../context/PregnancyContext';
import { useBaby } from '../../../context/BabyContext';
import { Card, ListRow, Screen, SectionHeader } from '../../../components/ui';
import { AccountSections, ProfileHeader } from '../../../components/profile/ProfileParts';
import { ageLabel } from '../../../lib/baby';
import { longDate } from '../../../lib/journal';
import type { IconName } from '../../../components/ui/Icon';

/** "You" in baby mode (F31): the baby, other babies, the pregnancy journal, then the shared account sections. */
export default function BabyProfileScreen() {
  const router = useRouter();
  const { user, userProfile, setCurrentMode } = useAuth();
  const { pregnancy } = usePregnancy();
  const { baby, babies, selectBaby } = useBaby();

  const displayName =
    pregnancy?.motherName || (userProfile?.name && userProfile.name !== 'User' ? userProfile.name : '') || user?.displayName || 'You';
  const others = babies.filter((b) => b.id !== baby?.id);

  const toPregnancy = async () => {
    await setCurrentMode('pregnancy');
    router.replace('/(pregnancy)/(tabs)/home');
  };

  return (
    <Screen header={{ title: 'Profile' }}>
      <ProfileHeader displayName={displayName} />

      {baby ? (
        <View>
          <SectionHeader title={baby.name} action="Edit" onAction={() => router.push('/(baby)/editbaby')} />
          <Card padded={false}>
            {(
              [
                ['happy-outline', 'Age', ageLabel(baby.birthDate.toDate())],
                ['calendar-outline', 'Born', longDate(baby.birthDate.toDate())],
                ['scale-outline', 'Birth weight', baby.birthWeight ? `${baby.birthWeight} kg` : undefined],
                ['resize-outline', 'Birth length', baby.birthHeight ? `${baby.birthHeight} cm` : undefined],
              ] as [IconName, string, string | undefined][]
            )
              .filter(([, , v]) => !!v)
              .map(([icon, title, value], i, rows) => (
                <ListRow key={title} icon={icon} title={title} value={value} last={i === rows.length - 1} />
              ))}
          </Card>
        </View>
      ) : null}

      <View>
        <SectionHeader title="Journals" />
        <Card padded={false}>
          {others.map((b) => (
            <ListRow
              key={b.id}
              icon="happy-outline"
              tone="plum"
              title={b.name}
              subtitle={ageLabel(b.birthDate.toDate())}
              value="Switch"
              onPress={() => selectBaby(b.id)}
            />
          ))}
          {baby?.fromPregnancyId ? (
            <ListRow
              icon="book-outline"
              tone="gold"
              title="Before you were born"
              subtitle="Your pregnancy journal"
              onPress={() => router.push({ pathname: '/(baby)/pregnancy-history', params: { id: baby.fromPregnancyId! } })}
            />
          ) : null}
          {pregnancy?.status === 'active' ? (
            <ListRow icon="swap-horizontal-outline" tone="teal" title="Switch to pregnancy journal" onPress={toPregnancy} />
          ) : (
            <ListRow icon="leaf-outline" tone="teal" title="Start a new pregnancy" onPress={() => router.push('/(onboarding)/create-pregnancy')} />
          )}
          <ListRow icon="add-circle-outline" title="Add another baby" onPress={() => router.push('/(onboarding)/create-baby')} last />
        </Card>
      </View>

      <AccountSections />
    </Screen>
  );
}
