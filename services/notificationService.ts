import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildWeekDoc } from '../constants/pregnancyWeeks';

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
  weeklyMilestone: boolean;   // "You're now week N", 9am on the day each new week starts
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

const DAY_MS = 24 * 60 * 60 * 1000;

/** How many upcoming week changes are scheduled at a time (re-synced on every app open). */
export const WEEK_UPDATES_AHEAD = 8;

/**
 * The next week changes: week N starts N weeks after (due date − 40 weeks),
 * the same convention as calculatePregnancyWeek. Each is at 9am local time,
 * stopping at week 40.
 */
export const upcomingWeekStarts = (dueDate: Date, now = new Date(), count = WEEK_UPDATES_AHEAD) => {
  const lmp = dueDate.getTime() - 40 * 7 * DAY_MS;
  const current = Math.floor((now.getTime() - lmp) / (7 * DAY_MS));
  const out: { week: number; date: Date }[] = [];
  for (let week = Math.max(1, current + 1); week <= 40 && out.length < count; week++) {
    const d = new Date(lmp + week * 7 * DAY_MS);
    const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0, 0);
    if (at > now) out.push({ week, date: at });
  }
  return out;
};

const withArticle = (noun: string) => `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun.toLowerCase()}`;

/** "This week your baby is about the size of a lime." — from the bundled week content. */
export const weekUpdateBody = (week: number): string => {
  const size = buildWeekDoc(week)?.babySize;
  return size && !/not yet|n\/a/i.test(size)
    ? `This week your baby is about the size of ${withArticle(size)}. See what's new.`
    : "See how your baby is growing this week and what's changing for you.";
};

/**
 * "You're now week N" (PRD F29) for the next few week changes. A repeating
 * notification can't change its text, so each week is its own one-off,
 * identified `weekly-week-{N}`.
 */
export const scheduleWeekUpdates = async (dueDate: Date, now = new Date()): Promise<number> => {
  const upcoming = upcomingWeekStarts(dueDate, now);
  for (const { week, date } of upcoming) {
    await Notifications.scheduleNotificationAsync({
      identifier: `weekly-week-${week}`,
      content: {
        title: `You're now week ${week}`,
        body: weekUpdateBody(week),
        data: { type: 'milestone', week },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
    });
  }
  return upcoming.length;
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
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const getScheduledNotifications = async (): Promise<Notifications.NotificationRequest[]> => {
  // Local scheduling doesn't exist on web; return nothing instead of throwing.
  if (Platform.OS === 'web') return [];
  return Notifications.getAllScheduledNotificationsAsync();
};

/* ------------------------------------------------------------- settings */

const SETTINGS_KEY = 'notification_settings';

export const loadNotificationSettings = async (): Promise<NotificationSettings> => {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return raw ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) } : DEFAULT_NOTIFICATION_SETTINGS;
};

export const saveNotificationSettings = async (settings: NotificationSettings): Promise<void> => {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

/** True if the user already allowed notifications. Never prompts. */
export const hasNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  const perm = (await Notifications.getPermissionsAsync()) as any;
  return !!(perm.granted || perm.status === 'granted');
};

/* ----------------------------------------------------------------- sync */

export interface ReminderVisit {
  id: string;
  /** Shown in the reminder text, e.g. "Glucose test". */
  title: string;
  nextVisitDate?: Date | null;
}

/**
 * Make the device's scheduled reminders match the settings and the journal.
 * Safe to call as often as visits change: it clears every reminder this app
 * owns (including ones for visits that have since been deleted) and schedules
 * the current set. Nothing is scheduled unless `active` (a pregnancy in
 * progress) and permission has already been granted.
 */
export const syncReminders = async (
  settings: NotificationSettings,
  { active, visits, dueDate }: { active: boolean; visits: ReminderVisit[]; dueDate?: Date | null }
): Promise<void> => {
  if (Platform.OS === 'web') return;
  await ensureChannel();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    const id = n.identifier;
    // 'weekly-milestone' is the old repeating reminder; cleared so upgraded installs don't get both.
    if (id === 'weekly-milestone' || id.startsWith('weekly-week-') || id === 'kick-reminder' || id.startsWith('visit-')) {
      await cancelNotification(id);
    }
  }

  if (!active || !(await hasNotificationPermission())) return;
  if (settings.weeklyMilestone && dueDate) await scheduleWeekUpdates(dueDate);
  if (settings.kickCountReminder) await scheduleKickReminder();
  if (settings.visitReminders) {
    const now = new Date();
    for (const v of visits) {
      if (v.nextVisitDate && v.nextVisitDate > now) await scheduleVisitReminder(v.nextVisitDate, v.title, v.id);
    }
  }
};
