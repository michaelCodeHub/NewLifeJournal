import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface NotificationSettings {
  visitReminders: boolean;    // 1 day before next visit
  weeklyMilestone: boolean;   // repeats every Sunday at 9am
  kickCountReminder: boolean; // repeats daily at 8pm
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  visitReminders: true,
  weeklyMilestone: true,
  kickCountReminder: true,
};

/** Android 8+ only shows notifications posted to a channel. */
const CHANNEL_ID = 'reminders';
const ensureChannel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  await ensureChannel();
  const existing = await Notifications.getPermissionsAsync() as any;
  if (existing.granted || existing.status === 'granted') return true;
  const result = await Notifications.requestPermissionsAsync() as any;
  return result.granted || result.status === 'granted';
};

/** One-off: 9am the day before the appointment. */
export const scheduleVisitReminder = async (
  visitDate: Date,
  visitType: string,
  visitId: string
): Promise<string | null> => {
  const reminderDate = new Date(visitDate);
  reminderDate.setDate(reminderDate.getDate() - 1);
  reminderDate.setHours(9, 0, 0, 0);
  if (reminderDate <= new Date()) return null;
  return Notifications.scheduleNotificationAsync({
    identifier: `visit-${visitId}`,
    content: {
      title: 'Appointment tomorrow',
      body: `Your ${visitType} appointment is tomorrow.`,
      data: { type: 'visit', visitId },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderDate, channelId: CHANNEL_ID },
  });
};

/**
 * Repeats every Sunday at 9am until turned off. The text is week-neutral
 * because a repeating notification can't change its content each week.
 */
export const scheduleWeeklyMilestone = async (): Promise<string | null> => {
  return Notifications.scheduleNotificationAsync({
    identifier: 'weekly-milestone',
    content: {
      title: 'Your weekly update',
      body: "See how your baby is growing this week and what's changing for you.",
      data: { type: 'milestone' },
    },
    // Expo weekdays: 1 = Sunday … 7 = Saturday.
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 9, minute: 0, channelId: CHANNEL_ID },
  });
};

/** Repeats every day at 8pm until turned off. */
export const scheduleKickReminder = async (): Promise<string | null> => {
  return Notifications.scheduleNotificationAsync({
    identifier: 'kick-reminder',
    content: {
      title: 'Kick count',
      body: "Take a few minutes to count your baby's movements.",
      data: { type: 'kick' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 20, minute: 0, channelId: CHANNEL_ID },
  });
};

export const cancelNotification = async (identifier: string): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync(identifier);
};

export const cancelAllNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const getScheduledNotifications = async (): Promise<Notifications.NotificationRequest[]> => {
  // Local scheduling doesn't exist on web; return nothing instead of throwing.
  if (Platform.OS === 'web') return [];
  return Notifications.getAllScheduledNotificationsAsync();
};
