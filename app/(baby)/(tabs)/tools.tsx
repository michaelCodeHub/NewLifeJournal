import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, ListRow, Screen, SectionHeader } from '../../../components/ui';
import { useBaby } from '../../../context/BabyContext';
import { useSubscription } from '../../../context/SubscriptionContext';

/** Baby mode's tools, grouped by job — same layout as the pregnancy Tools tab. */
export default function BabyToolsScreen() {
  const router = useRouter();
  const { baby } = useBaby();
  const { isPremium } = useSubscription();

  return (
    <Screen header={{ title: 'Tools' }}>
      <View>
        <SectionHeader title="Track" />
        <Card padded={false}>
          <ListRow
            icon="scale-outline"
            tone="green"
            title="Growth"
            subtitle="Weight, length and head circumference"
            onPress={() => router.push('/(baby)/growth')}
          />
          <ListRow
            icon="medical-outline"
            tone="red"
            title="Health & vaccines"
            subtitle="Vaccines, checkups, illnesses, medicines"
            onPress={() => router.push('/(baby)/health')}
            last
          />
        </Card>
      </View>

      {baby?.fromPregnancyId ? (
        <View>
          <SectionHeader title="Memories" />
          <Card padded={false}>
            <ListRow
              icon="book-outline"
              tone="gold"
              title="Before you were born"
              subtitle="Your pregnancy journal, week by week"
              onPress={() => router.push({ pathname: '/(baby)/pregnancy-history', params: { id: baby.fromPregnancyId! } })}
              last
            />
          </Card>
        </View>
      ) : null}

      <View>
        <SectionHeader title="Share" />
        <Card padded={false}>
          <ListRow
            icon="people-outline"
            tone="green"
            title="Community"
            subtitle="Connect with other parents"
            value={!isPremium ? 'Plus' : undefined}
            onPress={() => router.push('/(pregnancy)/community')}
            last
          />
        </Card>
      </View>
    </Screen>
  );
}
