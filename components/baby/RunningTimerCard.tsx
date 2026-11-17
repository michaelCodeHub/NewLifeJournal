import { StyleSheet, View } from 'react-native';
import { useBaby } from '../../context/BabyContext';
import { SPACE } from '../../context/ThemeContext';
import { Button, Card, IconTile, Text, useToast } from '../ui';
import { ElapsedText } from '../timers';
import { formatClock } from '../timers/format';
import { activityTitle, BABY_LOOK } from '../../lib/baby';
import { haptics } from '../../lib/haptics';
import type { BabyActivity } from '../../types';

/**
 * A feed or sleep that's in progress, with a live clock and Stop. The clock is
 * computed from the stored start time, so it's right after a restart too.
 */
export function RunningTimerCard({ activity }: { activity: BabyActivity }) {
  const { endActivity } = useBaby();
  const toast = useToast();
  const look = activity.type === 'sleep' ? BABY_LOOK.sleep : BABY_LOOK.feeding;
  const sleep = activity.type === 'sleep';

  const stop = async () => {
    try {
      await endActivity(activity.id);
      haptics.medium();
      toast.show(sleep ? 'Sleep saved' : 'Feed saved');
    } catch {
      toast.show("Couldn't stop the timer. Try again.", 'error');
    }
  };

  return (
    <Card tone="tinted" tint={sleep ? 'plumTint' : 'primaryLight'} style={styles.card}>
      <IconTile name={look.icon} tone={look.tone} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="footnote" color="textSecondary">
          {sleep ? 'Asleep for' : `${activityTitle(activity)}${activity.feeding?.side ? ` · ${activity.feeding.side}` : ''}`}
        </Text>
        <ElapsedText startedAt={activity.startedAt.toMillis()} format={formatClock} variant="title2" tabular />
      </View>
      <Button title={sleep ? 'Woke up' : 'Stop'} icon="stop-outline" size="sm" variant="secondary" onPress={stop} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
});
