import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, IconName } from '../../components/ui/Icon';
import * as Notifications from 'expo-notifications';
import { usePregnancy } from '../../context/PregnancyContext';
import { Theme, useThemedStyles, SPACE } from '../../context/ThemeContext';
import {
  Button,
  Card,
  EmptyState,
  IconTile,
  ListRow,
  Screen,
  ScreenState,
  SectionHeader,
  Text,
  Tone,
  useToast,
} from '../../components/ui';
import { ThemedSwitch } from '../../components/prep/ThemedSwitch';
import { visitTitle } from '../../lib/journal';
import {
  NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  requestNotificationPermission,
  getScheduledNotifications,
  loadNotificationSettings as loadSettings,
  saveNotificationSettings as saveSettings,
  syncReminders as syncDeviceReminders,
} from '../../services/notificationService';

const TITLE = 'Reminders';

const REMINDERS: {
  key: keyof NotificationSettings;
  title: string;
  subtitle: string;
  icon: IconName;
  tone: Tone;
}[] = [
  {
    key: 'visitReminders',
    title: 'Visit reminders',
    subtitle: 'Get reminded 1 day before appointments',
    icon: 'medkit-outline',
    tone: 'green',
  },
  {
    key: 'weeklyMilestone',
    title: 'Weekly updates',
    subtitle: 'Baby development update every Sunday',
    icon: 'star-outline',
    tone: 'gold',
  },
  {
    key: 'kickCountReminder',
    title: 'Kick count reminders',
    subtitle: 'Daily reminder at 8pm to log kicks',
    icon: 'footsteps-outline',
    tone: 'plum',
  },
];

const shortDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const formatTriggerDate = (notification: Notifications.NotificationRequest): string => {
  const trigger = notification.trigger as any;
  if (!trigger) return 'Unknown';
  // Repeating triggers have no single date — describe the schedule instead.
  if (typeof trigger.hour === 'number' && typeof trigger.minute === 'number') {
    const at = new Date(2000, 0, 1, trigger.hour, trigger.minute).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const DAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
    if (typeof trigger.weekday === 'number') return `${DAYS[trigger.weekday - 1] ?? 'Weekly'} at ${at}`;
    return `Every day at ${at}`;
  }
  // Native date triggers come back as `value` (ms) on newer expo-notifications, `date` on older ones.
  const raw = trigger.date ?? trigger.value ?? trigger.timestamp;
  const date = raw != null ? new Date(raw) : null;
  if (!date || isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Scheduled titles carry an emoji prefix ("🏥 Visit Reminder"); the icon tile replaces it here. */
const cleanTitle = (title?: string | null) => (title ?? 'Reminder').replace(/^[^A-Za-z0-9]+/, '') || 'Reminder';

const alertLook = (id: string): { icon: IconName; tone: Tone } => {
  if (id.startsWith('visit-')) return { icon: 'medkit-outline', tone: 'green' };
  if (id === 'weekly-milestone') return { icon: 'star-outline', tone: 'gold' };
  if (id === 'kick-reminder') return { icon: 'footsteps-outline', tone: 'plum' };
  return { icon: 'notifications-outline', tone: 'teal' };
};

export default function NotificationsScreen() {
  const { pregnancy, hospitalVisits, loading: pregnancyLoading } = usePregnancy();
  const styles = useThemedStyles(makeStyles);
  const toast = useToast();

  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(true);
  const [requesting, setRequesting] = useState(false);
  const [scheduledList, setScheduledList] = useState<Notifications.NotificationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Check permission and load settings on mount
  useEffect(() => {
    const init = async () => {
      try {
        const perm = (await Notifications.getPermissionsAsync()) as any;
        setPermissionGranted(perm.granted || perm.status === 'granted');

        const saved = await loadSettings();
        setSettings(saved);

        const scheduled = await getScheduledNotifications();
        setScheduledList(scheduled);
      } catch (err) {
        console.error('Notification init error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleRequestPermission = useCallback(async () => {
    setRequesting(true);
    try {
      const granted = await requestNotificationPermission();
      setPermissionGranted(granted);
      if (granted) toast.show('Reminders turned on');
      else toast.show('Enable notifications in your device settings to get reminders', 'error');
    } catch (err: any) {
      toast.show(err?.message || 'Could not request permission', 'error');
    } finally {
      setRequesting(false);
    }
  }, [toast]);

  /**
   * Make the device's scheduled reminders match the switches. Runs whenever a
   * switch changes or permission is granted, so there's no separate "apply"
   * step. Visit changes made elsewhere are synced by useReminderSync in the
   * pregnancy layout.
   */
  const syncReminders = useCallback(
    async (next: NotificationSettings) => {
      await syncDeviceReminders(next, {
        active: pregnancy?.status === 'active',
        visits: hospitalVisits.map((v) => ({ id: v.id, title: visitTitle(v), nextVisitDate: v.nextVisitDate?.toDate() ?? null })),
      });
      setScheduledList(await getScheduledNotifications());
    },
    // permissionGranted: re-sync right after the user allows notifications.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissionGranted, pregnancy, hospitalVisits],
  );

  // Keep reminders in step with permission and visit changes (after settings load).
  useEffect(() => {
    if (loading) return;
    syncReminders(settings).catch((err) => console.warn('Reminder sync failed:', err));
    // settings changes go through handleToggle, which syncs itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, syncReminders]);

  const handleToggle = useCallback(
    async (key: keyof NotificationSettings, value: boolean) => {
      const updated = { ...settings, [key]: value };
      setSettings(updated);
      try {
        await saveSettings(updated);
        await syncReminders(updated);
      } catch (err: any) {
        console.error('Notification toggle error:', err);
        toast.show('Could not update this reminder', 'error');
      }
    },
    [settings, syncReminders, toast],
  );

  // Next visit date for display
  const nextVisit = useMemo(
    () =>
      hospitalVisits
        .filter((v) => v.nextVisitDate)
        .map((v) => ({ date: v.nextVisitDate!.toDate(), title: visitTitle(v) }))
        .filter((v) => v.date > new Date())
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0],
    [hospitalVisits],
  );

  if (loading || pregnancyLoading) {
    return (
      <Screen header={{ variant: 'bar', title: TITLE }} scroll={false}>
        <ScreenState loading />
      </Screen>
    );
  }

  if (!pregnancy) {
    return (
      <Screen header={{ variant: 'bar', title: TITLE }} scroll={false}>
        <ScreenState
          icon="notifications-off-outline"
          title="No active pregnancy found"
          body="Set up your pregnancy profile to use notifications."
        />
      </Screen>
    );
  }

  return (
    <Screen header={{ variant: 'bar', title: TITLE }} contentStyle={styles.content}>
      {!permissionGranted ? (
        <Card tone="tinted" tint="orangeTint" style={styles.permissionCard}>
          <View style={styles.permissionRow}>
            <IconTile name="notifications-off-outline" tone="orange" size={36} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="headline">Notifications are off</Text>
              <Text variant="callout" color="textSecondary">
                Turn them on to get visit reminders, weekly updates and kick count nudges.
              </Text>
            </View>
          </View>
          <Button
            title="Turn on notifications"
            icon="notifications-outline"
            fullWidth
            loading={requesting}
            onPress={handleRequestPermission}
          />
        </Card>
      ) : null}

      <View>
        <Card padded={false}>
          {REMINDERS.map((r, i) => (
            <ListRow
              key={r.key}
              icon={r.icon}
              tone={r.tone}
              title={r.title}
              subtitle={
                r.key === 'visitReminders' && nextVisit
                  ? `Next: ${shortDate(nextVisit.date)} · ${nextVisit.title}`
                  : r.subtitle
              }
              last={i === REMINDERS.length - 1}
              right={
                <ThemedSwitch
                  value={settings[r.key]}
                  onValueChange={(v) => handleToggle(r.key, v)}
                  accessibilityLabel={r.title}
                />
              }
            />
          ))}
        </Card>
      </View>

      <View>
        <SectionHeader title="Coming up" />
        {scheduledList.length === 0 ? (
          <Card>
            <EmptyState
              icon="notifications-outline"
              title="Nothing scheduled"
              body={
                permissionGranted
                  ? 'Turn on a reminder above and it will show up here.'
                  : 'Turn on notifications to get these reminders.'
              }
            />
          </Card>
        ) : (
          <Card padded={false}>
            {scheduledList.map((notif, i) => {
              const look = alertLook(notif.identifier);
              return (
                <ListRow
                  key={notif.identifier}
                  icon={look.icon}
                  tone={look.tone}
                  title={cleanTitle(notif.content.title)}
                  subtitle={formatTriggerDate(notif)}
                  last={i === scheduledList.length - 1}
                />
              );
            })}
          </Card>
        )}
      </View>
    </Screen>
  );
}

const makeStyles = (_: Theme) =>
  StyleSheet.create({
    content: { paddingTop: SPACE.lg },
    permissionCard: { gap: SPACE.md },
    permissionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  });
