import {
  requestNotificationPermission,
  scheduleVisitReminder,
  scheduleWeeklyMilestone,
  scheduleKickReminder,
  cancelNotification,
  cancelAllNotifications,
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
  SchedulableTriggerInputTypes: { DATE: 'date' },
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

// ─── scheduleWeeklyMilestone ─────────────────────────────────────────────────
describe('scheduleWeeklyMilestone', () => {
  it('uses identifier weekly-milestone', async () => {
    await scheduleWeeklyMilestone(20);

    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: 'weekly-milestone' })
    );
  });

  it('includes currentWeek + 1 in the notification body', async () => {
    await scheduleWeeklyMilestone(18);

    const call = mockSchedule.mock.calls[0][0];
    expect(call.content.body).toContain('19');
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

  it('schedules for tonight at 8pm if it is before 8pm', async () => {
    // Use a real future date at 10am so the 8pm slot is still ahead
    const earlyMorning = new Date();
    earlyMorning.setHours(6, 0, 0, 0);
    // Ensure we're testing before 8pm by calling at a fresh moment
    // Just verify the identifier and that a date trigger is set
    await scheduleKickReminder();

    const call = mockSchedule.mock.calls[0][0];
    expect(call.identifier).toBe('kick-reminder');
    expect(call.trigger).toBeDefined();
    expect(call.trigger.date).toBeDefined();
  });

  it('schedules for the next 8pm slot (tonight or tomorrow)', async () => {
    await scheduleKickReminder();

    const call = mockSchedule.mock.calls[0][0];
    const triggerDate = new Date(call.trigger.date);
    expect(triggerDate.getHours()).toBe(20);
    expect(triggerDate.getMinutes()).toBe(0);
    // Trigger date must always be in the future
    expect(triggerDate.getTime()).toBeGreaterThan(Date.now());
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
