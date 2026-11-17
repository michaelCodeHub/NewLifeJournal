import {
  requestNotificationPermission,
  scheduleVisitReminder,
  scheduleWeekUpdates,
  upcomingWeekStarts,
  weekUpdateBody,
  scheduleKickReminder,
  cancelNotification,
  cancelAllNotifications,
  syncReminders,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../../services/notificationService';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily', WEEKLY: 'weekly' },
  AndroidImportance: { DEFAULT: 3 },
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import * as Notifications from 'expo-notifications';

const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockRequestPermissions = Notifications.requestPermissionsAsync as jest.Mock;
const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;
const mockCancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;
const mockCancelAll = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── DEFAULT_NOTIFICATION_SETTINGS ───────────────────────────────────────────
describe('DEFAULT_NOTIFICATION_SETTINGS', () => {
  it('has all three settings enabled by default', () => {
    expect(DEFAULT_NOTIFICATION_SETTINGS.visitReminders).toBe(true);
    expect(DEFAULT_NOTIFICATION_SETTINGS.weeklyMilestone).toBe(true);
    expect(DEFAULT_NOTIFICATION_SETTINGS.kickCountReminder).toBe(true);
  });
});

// ─── requestNotificationPermission ───────────────────────────────────────────
describe('requestNotificationPermission', () => {
  it('returns false on web platform', async () => {
    // Re-mock Platform.OS to 'web' for this test
    const RN = require('react-native');
    const original = RN.Platform.OS;
    RN.Platform.OS = 'web';

    const result = await requestNotificationPermission();
    expect(result).toBe(false);

    RN.Platform.OS = original;
  });

  it('returns true immediately if permission is already granted', async () => {
    mockGetPermissions.mockResolvedValueOnce({ status: 'granted' });

    const result = await requestNotificationPermission();
    expect(result).toBe(true);
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it('requests permission and returns true when granted', async () => {
    mockGetPermissions.mockResolvedValueOnce({ status: 'undetermined' });
    mockRequestPermissions.mockResolvedValueOnce({ status: 'granted' });

    const result = await requestNotificationPermission();
    expect(result).toBe(true);
    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
  });

  it('returns false when permission is denied', async () => {
    mockGetPermissions.mockResolvedValueOnce({ status: 'undetermined' });
    mockRequestPermissions.mockResolvedValueOnce({ status: 'denied' });

    const result = await requestNotificationPermission();
    expect(result).toBe(false);
  });
});

// ─── scheduleVisitReminder ───────────────────────────────────────────────────
describe('scheduleVisitReminder', () => {
  it('returns null if the reminder date (1 day before) is in the past', async () => {
    // Yesterday's date
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const result = await scheduleVisitReminder(pastDate, 'checkup', 'visit-123');
    expect(result).toBeNull();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('uses identifier visit-${visitId}', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    await scheduleVisitReminder(futureDate, 'checkup', 'abc123');

    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: 'visit-abc123' })
    );
  });

  it('includes visit type in the notification body', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    await scheduleVisitReminder(futureDate, 'ultrasound', 'xyz');

    const call = mockSchedule.mock.calls[0][0];
    expect(call.content.body).toContain('ultrasound');
  });
});

// ─── week updates (PRD F29) ──────────────────────────────────────────────────
describe('week updates', () => {
  const DAY = 86400000;
  // Due date → LMP is 280 days earlier; week N starts N*7 days after LMP.
  const due = new Date(2027, 0, 30, 12);
  const lmp = due.getTime() - 280 * DAY;

  it('lists the next week starts at 9am, oldest first, up to week 40', () => {
    const now = new Date(lmp + 20 * 7 * DAY + 2 * DAY); // in week 20
    const list = upcomingWeekStarts(due, now, 8);
    expect(list.map((x) => x.week)).toEqual([21, 22, 23, 24, 25, 26, 27, 28]);
    expect(list[0].date.getHours()).toBe(9);
    expect(upcomingWeekStarts(due, new Date(lmp + 38 * 7 * DAY + DAY), 8).map((x) => x.week)).toEqual([39, 40]);
  });

  it('says how big the baby is that week', () => {
    expect(weekUpdateBody(21)).toMatch(/^This week your baby is about the size of (a|an) /);
  });

  it("schedules one dated notification per week, titled \"You're now week N\"", async () => {
    const n = await scheduleWeekUpdates(due, new Date(lmp + 30 * 7 * DAY));
    expect(n).toBe(8);
    const first = mockSchedule.mock.calls[0][0];
    expect(first.identifier).toBe('weekly-week-31');
    expect(first.content.title).toBe("You're now week 31");
    expect(first.trigger.type).toBe('date');
  });
});

// ─── scheduleKickReminder ────────────────────────────────────────────────────
describe('scheduleKickReminder', () => {
  it('uses identifier kick-reminder', async () => {
    await scheduleKickReminder();

    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: 'kick-reminder' })
    );
  });

  it('repeats every day at 8pm', async () => {
    await scheduleKickReminder();

    const call = mockSchedule.mock.calls[0][0];
    expect(call.trigger).toEqual(expect.objectContaining({ type: 'daily', hour: 20, minute: 0 }));
  });
});

// ─── cancelNotification ──────────────────────────────────────────────────────
describe('cancelNotification', () => {
  it('calls cancelScheduledNotificationAsync with the given identifier', async () => {
    await cancelNotification('kick-reminder');
    expect(mockCancel).toHaveBeenCalledWith('kick-reminder');
  });
});

// ─── cancelAllNotifications ──────────────────────────────────────────────────
describe('cancelAllNotifications', () => {
  it('calls cancelAllScheduledNotificationsAsync', async () => {
    await cancelAllNotifications();
    expect(mockCancelAll).toHaveBeenCalledTimes(1);
  });
});

// ─── syncReminders ───────────────────────────────────────────────────────────
describe('syncReminders', () => {
  const mockGetAll = Notifications.getAllScheduledNotificationsAsync as jest.Mock;
  const inDays = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

  beforeEach(() => {
    mockGetPermissions.mockResolvedValue({ granted: true, status: 'granted' });
  });

  it("clears every reminder it owns, including ones for deleted visits, but not others", async () => {
    mockGetAll.mockResolvedValueOnce([
      { identifier: 'kick-reminder' },
      { identifier: 'weekly-milestone' },
      { identifier: 'weekly-week-12' },
      { identifier: 'visit-deleted' },
      { identifier: 'something-else' },
    ]);
    await syncReminders(DEFAULT_NOTIFICATION_SETTINGS, { active: true, visits: [] });
    expect(mockCancel).toHaveBeenCalledWith('kick-reminder');
    expect(mockCancel).toHaveBeenCalledWith('visit-deleted');
    expect(mockCancel).toHaveBeenCalledWith('weekly-milestone');
    expect(mockCancel).toHaveBeenCalledWith('weekly-week-12');
    expect(mockCancel).not.toHaveBeenCalledWith('something-else');
  });

  it('schedules repeating reminders and future next-appointment reminders with the visit title', async () => {
    await syncReminders(DEFAULT_NOTIFICATION_SETTINGS, {
      active: true,
      dueDate: inDays(100),
      visits: [
        { id: 'a', title: 'Glucose test', nextVisitDate: inDays(5) },
        { id: 'b', title: 'Checkup', nextVisitDate: inDays(-5) },
        { id: 'c', title: 'Checkup', nextVisitDate: null },
      ],
    });
    const ids: string[] = mockSchedule.mock.calls.map((c) => c[0].identifier);
    expect(ids.filter((id) => id.startsWith('weekly-week-'))).toHaveLength(8);
    expect(ids.slice(-2)).toEqual(['kick-reminder', 'visit-a']);
    expect(mockSchedule.mock.calls[ids.length - 1][0].content.body).toBe('Your Glucose test appointment is tomorrow.');
  });

  it('respects switched-off settings', async () => {
    await syncReminders(
      { visitReminders: false, weeklyMilestone: true, kickCountReminder: false },
      { active: true, dueDate: inDays(100), visits: [{ id: 'a', title: 'Checkup', nextVisitDate: inDays(5) }] }
    );
    const ids: string[] = mockSchedule.mock.calls.map((c) => c[0].identifier);
    expect(ids.length).toBe(8);
    expect(ids.every((id) => id.startsWith('weekly-week-'))).toBe(true);
  });

  it('schedules nothing once the pregnancy is no longer active', async () => {
    await syncReminders(DEFAULT_NOTIFICATION_SETTINGS, {
      active: false,
      visits: [{ id: 'a', title: 'Checkup', nextVisitDate: inDays(5) }],
    });
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('never prompts for permission and schedules nothing without it', async () => {
    mockGetPermissions.mockResolvedValue({ granted: false, status: 'denied' });
    await syncReminders(DEFAULT_NOTIFICATION_SETTINGS, { active: true, visits: [] });
    expect(mockRequestPermissions).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
  });
});
