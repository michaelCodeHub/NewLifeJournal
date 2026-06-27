import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { usePregnancy } from '../../context/PregnancyContext';
import { addKickSession, subscribeToKickSessions, deleteKickSession } from '../../services/firebase/kickCounterService';
import { KickSession } from '../../types/pregnancy';

const PRIMARY = '#81bec1';
const BACKGROUND = '#E0F2F3';
const ORANGE = '#FF9800';
const GREEN = '#4CAF50';
const RED = '#F44336';

export default function KickCounterScreen() {
  const { user } = useAuth();
  const { pregnancy, getCurrentWeek } = usePregnancy();

  // Session state
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [kickCount, setKickCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  // History state
  const [sessions, setSessions] = useState<KickSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Subscribe to kick sessions
  useEffect(() => {
    if (!user || !pregnancy) {
      setLoadingSessions(false);
      return;
    }

    const unsubscribe = subscribeToKickSessions(user.uid, pregnancy.id, (data) => {
      setSessions(data);
      setLoadingSessions(false);
    });

    return () => unsubscribe();
  }, [user, pregnancy]);

  // Timer tick
  useEffect(() => {
    if (isSessionActive) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isSessionActive]);

  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStartSession = useCallback(() => {
    setKickCount(0);
    setElapsedSeconds(0);
    setSessionStartTime(new Date());
    setIsSessionActive(true);
  }, []);

  const handleCountKick = useCallback(() => {
    if (!isSessionActive) return;
    setKickCount(prev => prev + 1);
  }, [isSessionActive]);

  const handleEndSession = useCallback(async () => {
    if (!user || !pregnancy || !sessionStartTime) return;

    setIsSessionActive(false);

    if (kickCount === 0) {
      Alert.alert('Session Ended', 'No kicks were recorded. Session was not saved.');
      return;
    }

    setSaving(true);
    try {
      const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
      const targetReached = kickCount >= 10;

      await addKickSession(user.uid, pregnancy.id, {
        pregnancyId: pregnancy.id,
        date: Timestamp.fromDate(sessionStartTime),
        week: getCurrentWeek(),
        kickCount,
        durationMinutes,
        targetReached,
      });

      Alert.alert(
        targetReached ? 'Great job! 🎉' : 'Session Saved',
        targetReached
          ? `You recorded ${kickCount} kicks in ${durationMinutes} min. Target reached!`
          : `You recorded ${kickCount} kicks in ${durationMinutes} min.`
      );
    } catch (error: any) {
      console.error('Error saving kick session:', error);
      Alert.alert('Error', 'Failed to save session. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [user, pregnancy, sessionStartTime, kickCount, elapsedSeconds, getCurrentWeek]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    if (!user || !pregnancy) return;

    Alert.alert('Delete Session', 'Are you sure you want to delete this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteKickSession(user.uid, pregnancy.id, sessionId);
          } catch (error: any) {
            console.error('Error deleting kick session:', error);
            Alert.alert('Error', 'Failed to delete session.');
          }
        },
      },
    ]);
  }, [user, pregnancy]);

  const formatSessionDate = (timestamp: Timestamp): string => {
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderSessionItem = ({ item }: { item: KickSession }) => (
    <View style={styles.sessionCard}>
      <View style={styles.sessionCardLeft}>
        <Text style={styles.sessionDate}>{formatSessionDate(item.date)}</Text>
        <Text style={styles.sessionDetail}>
          {item.kickCount} kicks in {item.durationMinutes} min • Week {item.week}
        </Text>
      </View>
      <View style={styles.sessionCardRight}>
        <Text style={styles.sessionTarget}>{item.targetReached ? '✅' : '❌'}</Text>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDeleteSession(item.id)}
        >
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyHistory = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>No sessions yet.</Text>
      <Text style={styles.emptyStateSubText}>Start your first kick counting session!</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kick Counter</Text>
        <Text style={styles.headerSubtitle}>Week {getCurrentWeek()}</Text>
      </View>

      {/* Active Session UI */}
      {isSessionActive ? (
        <View style={styles.activeSession}>
          {/* Timer */}
          <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>

          {/* Kick circle + tap area */}
          <TouchableOpacity
            style={styles.kickCircle}
            onPress={handleCountKick}
            activeOpacity={0.75}
          >
            <Text style={styles.kickCount}>{kickCount}</Text>
            <Text style={styles.kickLabel}>👶 Tap to Count a Kick</Text>
          </TouchableOpacity>

          {/* Target reached banner */}
          {kickCount >= 10 && (
            <View style={styles.targetBanner}>
              <Text style={styles.targetBannerText}>🎯 Target reached! 10 kicks!</Text>
            </View>
          )}

          {/* End session button */}
          <TouchableOpacity
            style={styles.endSessionBtn}
            onPress={handleEndSession}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.endSessionBtnText}>End Session</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        /* Idle UI */
        <View style={styles.idleSection}>
          <Text style={styles.goalText}>Count baby kicks. Goal: 10 kicks.</Text>
          <Text style={styles.goalSubtext}>
            Counting kicks daily helps you track your baby's activity and well-being.
          </Text>
          <TouchableOpacity style={styles.startBtn} onPress={handleStartSession}>
            <Text style={styles.startBtnText}>Start Counting</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* History */}
      {!isSessionActive && (
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Session History</Text>
          {loadingSessions ? (
            <ActivityIndicator color={PRIMARY} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={sessions}
              keyExtractor={(item) => item.id}
              renderItem={renderSessionItem}
              ListEmptyComponent={renderEmptyHistory}
              contentContainerStyle={sessions.length === 0 ? styles.emptyListContainer : undefined}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}
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

  // Idle state
  idleSection: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 32,
    paddingBottom: 24,
  },
  goalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  goalSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  startBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 50,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  startBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },

  // Active session
  activeSession: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  timerText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#555',
    letterSpacing: 2,
    marginBottom: 20,
  },
  kickCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    marginBottom: 20,
  },
  kickCount: {
    fontSize: 72,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 80,
  },
  kickLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  targetBanner: {
    backgroundColor: GREEN,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginBottom: 16,
  },
  targetBannerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  endSessionBtn: {
    backgroundColor: ORANGE,
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    minWidth: 180,
    alignItems: 'center',
  },
  endSessionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  // History
  historySection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  historyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY,
  },
  sessionCardLeft: {
    flex: 1,
    marginRight: 10,
  },
  sessionDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  sessionDetail: {
    fontSize: 12,
    color: '#666',
  },
  sessionCardRight: {
    alignItems: 'center',
    gap: 6,
  },
  sessionTarget: {
    fontSize: 20,
  },
  deleteBtn: {
    backgroundColor: RED,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  // Empty state
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 30,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  emptyStateSubText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
  },
});
