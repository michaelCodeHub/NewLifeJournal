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
  ScrollView,
} from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { usePregnancy } from '../../context/PregnancyContext';
import {
  saveContractionSession,
  subscribeToContractionSessions,
  deleteContractionSession,
  check511Rule,
} from '../../services/firebase/contractionService';
import { ContractionSession, Contraction } from '../../types/pregnancy';

const PRIMARY = '#81bec1';
const BACKGROUND = '#E0F2F3';
const ORANGE = '#FF9800';
const RED = '#F44336';

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function ContractionTimerScreen() {
  const { user } = useAuth();
  const { pregnancy, getCurrentWeek } = usePregnancy();

  // Session-level state
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionElapsed, setSessionElapsed] = useState(0); // seconds

  // Contraction-level state
  const [contractionActive, setContractionActive] = useState(false);
  const [currentContractionStart, setCurrentContractionStart] = useState<Date | null>(null);
  const [contractionElapsed, setContractionElapsed] = useState(0); // seconds
  const [contractions, setContractions] = useState<Contraction[]>([]);
  const [lastEnded, setLastEnded] = useState<Date | null>(null); // when last contraction ended

  // 5-1-1 alert
  const [show511, setShow511] = useState(false);

  // History
  const [sessions, setSessions] = useState<ContractionSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [saving, setSaving] = useState(false);

  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const contractionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Subscribe to session history
  useEffect(() => {
    if (!user || !pregnancy) {
      setLoadingSessions(false);
      return;
    }
    const unsubscribe = subscribeToContractionSessions(user.uid, pregnancy.id, (data) => {
      setSessions(data);
      setLoadingSessions(false);
    });
    return () => unsubscribe();
  }, [user, pregnancy]);

  // Session elapsed timer
  useEffect(() => {
    if (sessionActive) {
      sessionTimerRef.current = setInterval(() => {
        setSessionElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    }
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    };
  }, [sessionActive]);

  // Contraction duration timer
  useEffect(() => {
    if (contractionActive) {
      contractionTimerRef.current = setInterval(() => {
        setContractionElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (contractionTimerRef.current) {
        clearInterval(contractionTimerRef.current);
        contractionTimerRef.current = null;
      }
    }
    return () => {
      if (contractionTimerRef.current) {
        clearInterval(contractionTimerRef.current);
        contractionTimerRef.current = null;
      }
    };
  }, [contractionActive]);

  const handleStartSession = useCallback(() => {
    const now = new Date();
    setSessionStartTime(now);
    setSessionElapsed(0);
    setContractions([]);
    setLastEnded(null);
    setShow511(false);
    setSessionActive(true);
  }, []);

  const handleContractionStarted = useCallback(() => {
    if (!sessionActive || contractionActive) return;
    setCurrentContractionStart(new Date());
    setContractionElapsed(0);
    setContractionActive(true);
  }, [sessionActive, contractionActive]);

  const handleContractionEnded = useCallback(() => {
    if (!contractionActive || !currentContractionStart) return;

    const endTime = new Date();
    const durationSeconds = Math.round((endTime.getTime() - currentContractionStart.getTime()) / 1000);

    let intervalSeconds: number | undefined;
    if (lastEnded) {
      intervalSeconds = Math.round((currentContractionStart.getTime() - lastEnded.getTime()) / 1000);
    }

    const newContraction: Contraction = {
      startTime: Timestamp.fromDate(currentContractionStart),
      endTime: Timestamp.fromDate(endTime),
      durationSeconds,
      intervalSeconds,
    };

    setContractions(prev => {
      const updated = [...prev, newContraction];
      // Check 5-1-1 rule against updated list
      if (check511Rule(updated)) {
        setShow511(true);
      }
      return updated;
    });

    setLastEnded(endTime);
    setContractionActive(false);
    setCurrentContractionStart(null);
    setContractionElapsed(0);
  }, [contractionActive, currentContractionStart, lastEnded]);

  const handleEndSession = useCallback(async () => {
    if (!user || !pregnancy || !sessionStartTime) return;

    // Stop any active contraction first
    if (contractionActive) {
      handleContractionEnded();
    }

    setSessionActive(false);
    setContractionActive(false);

    if (contractions.length === 0) {
      Alert.alert('Session Ended', 'No contractions were recorded. Session was not saved.');
      resetState();
      return;
    }

    setSaving(true);
    try {
      const durationMinutes = Math.max(1, Math.round(sessionElapsed / 60));
      const avgDuration = Math.round(
        contractions.reduce((sum, c) => sum + c.durationSeconds, 0) / contractions.length
      );
      const intervalsWithValues = contractions
        .filter(c => c.intervalSeconds !== undefined)
        .map(c => c.intervalSeconds as number);
      const avgInterval = intervalsWithValues.length > 0
        ? Math.round(intervalsWithValues.reduce((sum, v) => sum + v, 0) / intervalsWithValues.length)
        : 0;

      await saveContractionSession(user.uid, pregnancy.id, {
        pregnancyId: pregnancy.id,
        date: Timestamp.fromDate(sessionStartTime),
        week: getCurrentWeek(),
        contractions,
        durationMinutes,
        averageDurationSeconds: avgDuration,
        averageIntervalSeconds: avgInterval,
      });

      Alert.alert(
        'Session Saved',
        `Recorded ${contractions.length} contraction${contractions.length !== 1 ? 's' : ''} over ${durationMinutes} min.\nAvg duration: ${avgDuration}s | Avg interval: ${avgInterval}s`
      );
    } catch (error: any) {
      console.error('Error saving contraction session:', error);
      Alert.alert('Error', 'Failed to save session. Please try again.');
    } finally {
      setSaving(false);
      resetState();
    }
  }, [user, pregnancy, sessionStartTime, contractions, contractionActive, sessionElapsed, getCurrentWeek, handleContractionEnded]);

  const resetState = () => {
    setSessionStartTime(null);
    setSessionElapsed(0);
    setContractions([]);
    setLastEnded(null);
    setCurrentContractionStart(null);
    setContractionElapsed(0);
    setShow511(false);
  };

  const handleDeleteSession = useCallback((sessionId: string) => {
    if (!user || !pregnancy) return;
    Alert.alert('Delete Session', 'Are you sure you want to delete this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteContractionSession(user.uid, pregnancy.id, sessionId);
          } catch (error: any) {
            console.error('Error deleting contraction session:', error);
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

  const lastContraction = contractions.length > 0 ? contractions[contractions.length - 1] : null;

  const avgInterval = (() => {
    const vals = contractions.filter(c => c.intervalSeconds !== undefined).map(c => c.intervalSeconds as number);
    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  })();

  const renderSessionItem = ({ item }: { item: ContractionSession }) => (
    <View style={styles.sessionCard}>
      <View style={styles.sessionCardLeft}>
        <Text style={styles.sessionDate}>{formatSessionDate(item.date)}</Text>
        <Text style={styles.sessionDetail}>
          {item.contractions.length} contraction{item.contractions.length !== 1 ? 's' : ''} • Week {item.week}
        </Text>
        <Text style={styles.sessionDetail}>
          Avg duration: {item.averageDurationSeconds}s | Avg interval: {item.averageIntervalSeconds}s
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDeleteSession(item.id)}
      >
        <Text style={styles.deleteBtnText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyHistory = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>No sessions recorded yet.</Text>
      <Text style={styles.emptyStateSubText}>Start tracking your contractions!</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contraction Timer</Text>
        <Text style={styles.headerSubtitle}>Week {getCurrentWeek()}</Text>
      </View>

      {/* 5-1-1 Alert Banner */}
      {show511 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertBannerText}>
            ⚠️ Active labor pattern detected! Consider heading to the hospital.
          </Text>
        </View>
      )}

      {!sessionActive ? (
        /* Idle state */
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.idleSection}>
            <View style={styles.explainerCard}>
              <Text style={styles.explainerTitle}>How to use</Text>
              <Text style={styles.explainerText}>
                Track contractions to know when to head to the hospital. Use the 5-1-1 rule: contractions every 5 minutes, lasting 1 minute, for 1 hour.
              </Text>
            </View>
            <TouchableOpacity style={styles.startBtn} onPress={handleStartSession}>
              <Text style={styles.startBtnText}>Start Session</Text>
            </TouchableOpacity>
          </View>

          {/* Session History */}
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
                scrollEnabled={false}
                contentContainerStyle={sessions.length === 0 ? styles.emptyListContainer : undefined}
              />
            )}
          </View>
        </ScrollView>
      ) : (
        /* Active session */
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Session elapsed */}
          <View style={styles.sessionStats}>
            <Text style={styles.sessionElapsedLabel}>Session Time</Text>
            <Text style={styles.sessionElapsedTime}>{formatTime(sessionElapsed)}</Text>
            <Text style={styles.contractionCount}>
              {contractions.length} contraction{contractions.length !== 1 ? 's' : ''}
            </Text>
            {avgInterval > 0 && (
              <Text style={styles.avgIntervalText}>Avg interval: {avgInterval}s</Text>
            )}
          </View>

          {contractionActive ? (
            /* Contraction in progress */
            <View style={styles.activeContractionSection}>
              <Text style={styles.contractionLabel}>Contraction in progress</Text>
              <Text style={styles.contractionDuration}>{formatTime(contractionElapsed)}</Text>
              <TouchableOpacity
                style={styles.contractionEndBtn}
                onPress={handleContractionEnded}
              >
                <Text style={styles.contractionEndBtnText}>Contraction Ended</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Waiting for next contraction */
            <View style={styles.waitingSection}>
              {lastContraction && (
                <View style={styles.lastContractionCard}>
                  <Text style={styles.lastContractionText}>
                    Last: {lastContraction.durationSeconds}s duration
                    {lastContraction.intervalSeconds !== undefined
                      ? ` | ${lastContraction.intervalSeconds}s since previous`
                      : ''}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.contractionStartBtn}
                onPress={handleContractionStarted}
              >
                <Text style={styles.contractionStartBtnText}>Contraction Started</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* End Session button */}
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
        </ScrollView>
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

  // 5-1-1 Alert Banner
  alertBanner: {
    backgroundColor: RED,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  alertBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },

  scrollContent: {
    paddingBottom: 32,
  },

  // Idle state
  idleSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
  },
  explainerCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 28,
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY,
  },
  explainerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  explainerText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 21,
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
  sessionStats: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  sessionElapsedLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sessionElapsedTime: {
    fontSize: 40,
    fontWeight: '300',
    color: '#444',
    letterSpacing: 2,
    marginTop: 4,
  },
  contractionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY,
    marginTop: 6,
  },
  avgIntervalText: {
    fontSize: 13,
    color: '#888',
    marginTop: 3,
  },

  // Waiting for contraction
  waitingSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  lastContractionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  lastContractionText: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
  },
  contractionStartBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 20,
    paddingHorizontal: 50,
    borderRadius: 50,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
  },
  contractionStartBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },

  // Contraction in progress
  activeContractionSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  contractionLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  contractionDuration: {
    fontSize: 64,
    fontWeight: '700',
    color: RED,
    letterSpacing: 2,
    marginBottom: 24,
  },
  contractionEndBtn: {
    backgroundColor: ORANGE,
    paddingVertical: 20,
    paddingHorizontal: 50,
    borderRadius: 50,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
  },
  contractionEndBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },

  // End session
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
    alignSelf: 'center',
    marginTop: 20,
  },
  endSessionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  // History
  historySection: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
    marginTop: 1,
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
    paddingTop: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 20,
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
