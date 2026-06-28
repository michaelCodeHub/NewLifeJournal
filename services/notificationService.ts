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
  weeklyMilestone: boolean;   // every Sunday at 9am
  kickCountReminder: boolean; // daily at 8pm
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  visitReminders: true,
  weeklyMilestone: true,
  kickCountReminder: true,
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  const existing = await Notifications.getPermissionsAsync() as any;
  if (existing.granted || existing.status === 'granted') return true;
  const result = await Notifications.requestPermissionsAsync() as any;
  return result.granted || result.status === 'granted';
};

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
      title: '🏥 Visit Reminder',
      body: `Your ${visitType} appointment is tomorrow.`,
      data: { type: 'visit', visitId },
    },
    trigger: { date: reminderDate, type: Notifications.SchedulableTriggerInputTypes.DATE },
  });
};

export const scheduleWeeklyMilestone = async (currentWeek: number): Promise<string | null> => {
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(9, 0, 0, 0);
  return Notifications.scheduleNotificationAsync({
    identifier: 'weekly-milestone',
    content: {
      title: '🌟 Weekly Update',
      body: `You're now in week ${currentWeek + 1} of your pregnancy! Check your app for this week's development info.`,
      data: { type: 'milestone' },
    },
    trigger: { date: nextSunday, type: Notifications.SchedulableTriggerInputTypes.DATE },
  });
};

export const scheduleKickReminder = async (): Promise<string | null> => {
  const tonight = new Date();
  tonight.setHours(20, 0, 0, 0);
  if (tonight <= new Date()) {
    tonight.setDate(tonight.getDate() + 1);
  }
  return Notifications.scheduleNotificationAsync({
    identifier: 'kick-reminder',
    content: {
      title: '👶 Kick Count Reminder',
      body: "Don't forget to log baby's kicks today!",
      data: { type: 'kick' },
    },
    trigger: { date: tonight, type: Notifications.SchedulableTriggerInputTypes.DATE },
  });
};

export const cancelNotification = async (identifier: string): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync(identifier);
};

export const cancelAllNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const getScheduledNotifications = async (): Promise<Notifications.NotificationRequest[]> => {
  return Notifications.getAllScheduledNotificationsAsync();
};
