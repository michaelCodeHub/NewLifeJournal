import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../../context/AuthContext';
import { usePregnancy } from '../../context/PregnancyContext';
import {
  NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  requestNotificationPermission,
  scheduleVisitReminder,
  scheduleWeeklyMilestone,
  scheduleKickReminder,
  cancelNotification,
  getScheduledNotifications,
} from '../../services/notificationService';

const PRIMARY = '#81bec1';
const BACKGROUND = '#E0F2F3';
const ORANGE = '#FF9800';
const WARNING_BG = '#FFF3CD';
const WARNING_BORDER = '#FFC107';

const SETTINGS_KEY = 'notification_settings';

const loadSettings = async (): Promise<NotificationSettings> => {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return raw ? JSON.parse(raw) : DEFAULT_NOTIFICATION_SETTINGS;
};

const saveSettings = async (settings: NotificationSettings): Promise<void> => {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { pregnancy, hospitalVisits, getCurrentWeek } = usePregnancy();

  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(true);
  const [scheduledList, setScheduledList] = useState<Notifications.NotificationRequest[]>([]);
  const [scheduling, setScheduling] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check permission and load settings on mount
  useEffect(() => {
    const init = async () => {
      try {
        const perm = await Notifications.getPermissionsAsync() as any;
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
    const granted = await requestNotificationPermission();
    setPermissionGranted(granted);
    if (!granted) {
      Alert.alert(
        'Permission Denied',
        'Please enable notifications in your device settings to receive reminders.'
      );
    }
  }, []);

  const handleToggle = useCallback(
    async (key: keyof NotificationSettings, value: boolean) => {
      const updated = { ...settings, [key]: value };
      setSettings(updated);
      await saveSettings(updated);

      // Cancel corresponding notification if toggled off
      if (!value) {
        if (key === 'weeklyMilestone') await cancelNotification('weekly-milestone');
        if (key === 'kickCountReminder') await cancelNotification('kick-reminder');
        if (key === 'visitReminders') {
          for (const visit of hospitalVisits) {
            await cancelNotification(`visit-${visit.id}`);
          }
        }
      }
    },
    [settings, hospitalVisits]
  );

  const handleScheduleAll = useCallback(async () => {
    if (!pregnancy) return;
    if (!permissionGranted) {
      Alert.alert('Permission Required', 'Please enable notifications first.');
      return;
    }
    setScheduling(true);
    try {
      await cancelNotification('weekly-milestone');
      await cancelNotification('kick-reminder');

      if (settings.weeklyMilestone) await scheduleWeeklyMilestone(getCurrentWeek());
      if (settings.kickCountReminder) await scheduleKickReminder();

      if (settings.visitReminders) {
        const futureVisits = hospitalVisits.filter((v) => v.nextVisitDate);
        for (const visit of futureVisits) {
          await cancelNotification(`visit-${visit.id}`);
          await scheduleVisitReminder(
            visit.nextVisitDate!.toDate(),
            visit.type,
            visit.id
          );
        }
      }

      const scheduled = await getScheduledNotifications();
      setScheduledList(scheduled);
      Alert.alert('Done', 'Notifications scheduled successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to schedule notifications.');
    } finally {
      setScheduling(false);
    }
  }, [pregnancy, permissionGranted, settings, hospitalVisits, getCurrentWeek]);

  const formatTriggerDate = (notification: Notifications.NotificationRequest): string => {
    const trigger = notification.trigger as any;
    if (!trigger) return 'Unknown';
    const date = trigger.date ? new Date(trigger.date) : null;
    if (!date) return 'Unknown';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Next visit date for display
  const nextVisit = hospitalVisits
    .filter((v) => v.nextVisitDate)
    .map((v) => ({ date: v.nextVisitDate!.toDate(), type: v.type }))
    .filter((v) => v.date > new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={PRIMARY} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!pregnancy) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No active pregnancy found.</Text>
          <Text style={styles.emptySubText}>Set up your pregnancy profile to use notifications.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSubtitle}>Week {getCurrentWeek()}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Permission Banner */}
        {!permissionGranted && (
          <TouchableOpacity style={styles.permissionBanner} onPress={handleRequestPermission} activeOpacity={0.8}>
            <Text style={styles.permissionIcon}>⚠️</Text>
            <View style={styles.permissionTextContainer}>
              <Text style={styles.permissionTitle}>Notifications are disabled</Text>
              <Text style={styles.permissionSubText}>Tap to enable notifications.</Text>
            </View>
            <Text style={styles.permissionChevron}>›</Text>
          </TouchableOpacity>
        )}

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Settings</Text>

          {/* Visit Reminders */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Text style={styles.toggleIcon}>🏥</Text>
              <View>
                <Text style={styles.toggleLabel}>Visit Reminders</Text>
                <Text style={styles.toggleSubLabel}>Get reminded 1 day before appointments</Text>
              </View>
            </View>
            <Switch
              value={settings.visitReminders}
              onValueChange={(v) => handleToggle('visitReminders', v)}
              trackColor={{ false: '#ccc', true: PRIMARY }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.divider} />

          {/* Weekly Updates */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Text style={styles.toggleIcon}>🌟</Text>
              <View>
                <Text style={styles.toggleLabel}>Weekly Updates</Text>
                <Text style={styles.toggleSubLabel}>Baby development update every Sunday</Text>
              </View>
            </View>
            <Switch
              value={settings.weeklyMilestone}
              onValueChange={(v) => handleToggle('weeklyMilestone', v)}
              trackColor={{ false: '#ccc', true: PRIMARY }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.divider} />

          {/* Kick Count Reminders */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Text style={styles.toggleIcon}>👶</Text>
              <View>
                <Text style={styles.toggleLabel}>Kick Count Reminders</Text>
                <Text style={styles.toggleSubLabel}>Daily reminder at 8pm to log kicks</Text>
              </View>
            </View>
            <Switch
              value={settings.kickCountReminder}
              onValueChange={(v) => handleToggle('kickCountReminder', v)}
              trackColor={{ false: '#ccc', true: PRIMARY }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Schedule Now Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule Now</Text>

          {nextVisit && (
            <View style={styles.nextVisitCard}>
              <Text style={styles.nextVisitLabel}>Next visit:</Text>
              <Text style={styles.nextVisitValue}>
                {nextVisit.date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                — {nextVisit.type}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.applyButton, scheduling && styles.applyButtonDisabled]}
            onPress={handleScheduleAll}
            disabled={scheduling}
            activeOpacity={0.8}
          >
            {scheduling ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.applyButtonText}>Apply Notification Settings</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Upcoming Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Alerts</Text>

          {scheduledList.length === 0 ? (
            <View style={styles.emptyAlertsCard}>
              <Text style={styles.emptyAlertsText}>None scheduled</Text>
              <Text style={styles.emptyAlertsSubText}>
                Tap "Apply Notification Settings" to schedule alerts.
              </Text>
            </View>
          ) : (
            scheduledList.map((notif) => (
              <View key={notif.identifier} style={styles.alertCard}>
                <Text style={styles.alertTitle}>{notif.content.title}</Text>
                <Text style={styles.alertDate}>{formatTriggerDate(notif)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    backgroundColor: PRIMARY,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#555',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },

  // Permission banner
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WARNING_BG,
    borderWidth: 1,
    borderColor: WARNING_BORDER,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  permissionIcon: {
    fontSize: 22,
  },
  permissionTextContainer: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#856404',
  },
  permissionSubText: {
    fontSize: 12,
    color: '#856404',
    marginTop: 2,
  },
  permissionChevron: {
    fontSize: 22,
    color: '#856404',
    fontWeight: '600',
  },

  // Section
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 14,
  },

  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginRight: 12,
  },
  toggleIcon: {
    fontSize: 22,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  toggleSubLabel: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 10,
  },

  // Schedule section
  nextVisitCard: {
    backgroundColor: BACKGROUND,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextVisitLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  nextVisitValue: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  applyButton: {
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  applyButtonDisabled: {
    opacity: 0.6,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  // Alerts list
  emptyAlertsCard: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyAlertsText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#777',
    marginBottom: 4,
  },
  emptyAlertsSubText: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: BACKGROUND,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  alertDate: {
    fontSize: 12,
    color: '#666',
  },
});
