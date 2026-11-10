import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, ListRow, Screen, SectionHeader, Tone } from '../../../components/ui';
import { useSubscription } from '../../../context/SubscriptionContext';
import { FEATURE_BY_NAME } from '../../../lib/featurePriority';

type Group = { title: string; items: { name: string; tone: Tone; premium?: boolean }[] };

/** Every feature, grouped by job — replaces the old 14-item reshuffling tab bar. */
const GROUPS: Group[] = [
  {
    title: 'Track',
    items: [
      { name: 'symptoms', tone: 'orange' },
      { name: 'visits', tone: 'green' },
      { name: 'kickcounter', tone: 'plum' },
      { name: 'contractiontimer', tone: 'red' },
      { name: 'charts', tone: 'blue', premium: true },
    ],
  },
  {
    title: 'Prepare',
    items: [
      { name: 'checklist', tone: 'teal' },
      { name: 'birthplan', tone: 'gold', premium: true },
      { name: 'notifications', tone: 'neutral' },
    ],
  },
  {
    title: 'Share',
    items: [
      { name: 'export', tone: 'blue', premium: true },
      { name: 'sharetimeline', tone: 'plum', premium: true },
      { name: 'community', tone: 'green', premium: true },
    ],
  },
];

export default function ToolsScreen() {
  const router = useRouter();
  const { isPremium } = useSubscription();

  return (
    <Screen header={{ title: 'Tools' }}>
      {GROUPS.map((g) => (
        <View key={g.title}>
          <SectionHeader title={g.title} />
          <Card padded={false}>
            {g.items.map((item, i) => {
              const f = FEATURE_BY_NAME[item.name];
              if (!f) return null;
              return (
                <ListRow
                  key={f.name}
                  icon={f.icon}
                  tone={item.tone}
                  title={f.title}
                  subtitle={f.description}
                  value={item.premium && !isPremium ? 'Plus' : undefined}
                  onPress={() => router.push(f.route as any)}
                  last={i === g.items.length - 1}
                />
              );
            })}
          </Card>
        </View>
      ))}
    </Screen>
  );
}
