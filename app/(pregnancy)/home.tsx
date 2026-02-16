import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { usePregnancy } from '../../context/PregnancyContext';
import { useAuth } from '../../context/AuthContext';
import { getWeekInfo, WeekInfo } from '../../services/firebase/weekInfoService';

export default function PregnancyHomeScreen() {
  const { pregnancy, hospitalVisits, symptoms, loading, getCurrentWeek, getDaysUntilDue } = usePregnancy();
  const { signOut } = useAuth();
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);
  const [loadingWeekInfo, setLoadingWeekInfo] = useState(true);

  useEffect(() => {
    const fetchWeekInfo = async () => {
      if (pregnancy) {
        const week = getCurrentWeek();
        const info = await getWeekInfo(week);
        setWeekInfo(info);
        setLoadingWeekInfo(false);
      }
    };

    fetchWeekInfo();
  }, [pregnancy]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!pregnancy) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No Pregnancy Found</Text>
        <Text style={styles.subtitle}>Please create a pregnancy profile</Text>
      </View>
    );
  }

  const currentWeek = getCurrentWeek();
  const daysUntilDue = getDaysUntilDue();
  const totalDays = 280; // 40 weeks = 280 days
  const currentDay = totalDays - daysUntilDue;

  // Calculate weeks and days
  const weeks = Math.floor(currentDay / 7);
  const days = currentDay % 7;

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header with Title */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Today</Text>
        <TouchableOpacity onPress={signOut} style={styles.profileButton}>
          <Text style={styles.profileEmoji}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Hero Card with Baby Visualization */}
      <View style={styles.heroCard}>
        <Text style={styles.heroGreeting}>{getGreeting()},</Text>
        <Text style={styles.heroName}>{pregnancy.motherName}</Text>

        {/* Baby Visualization Area */}
        <View style={styles.babyVisualization}>
          <Text style={styles.babyEmoji}>👶</Text>
          <Text style={styles.babySize}>{weekInfo?.babySize || 'Growing'}</Text>
        </View>

        {/* Day Counter */}
        <View style={styles.dayCounterContainer}>
          <Text style={styles.dayCounter}>Day {currentDay}</Text>
          <TouchableOpacity style={styles.openButton}>
            <Text style={styles.openButtonText}>Open</Text>
            <Text style={styles.openButtonArrow}>▶</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pregnancy Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoWeeks}>{weeks} weeks, {days} days pregnant</Text>
        <Text style={styles.infoTrimester}>
          {currentWeek <= 12 ? 'First trimester' : currentWeek <= 26 ? 'Second trimester' : 'Third trimester'}
        </Text>
        <Text style={styles.infoDueDate}>
          Due {pregnancy.dueDate.toDate().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
        </Text>

        {/* Progress Bar */}
        <View style={styles.modernProgressBar}>
          <View style={[styles.modernProgressFill, { width: `${Math.min((currentWeek / 40) * 100, 100)}%` }]} />
        </View>
      </View>

      {/* Week Information */}
      {loadingWeekInfo ? (
        <View style={styles.section}>
          <ActivityIndicator size="small" color="#E91E63" />
        </View>
      ) : weekInfo ? (
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Size</Text>
            <Text style={styles.detailValue}>{weekInfo.babySize}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Length</Text>
            <Text style={styles.detailValue}>{weekInfo.babyLength}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Weight</Text>
            <Text style={styles.detailValue}>{weekInfo.babyWeight}</Text>
          </View>
        </View>
      ) : null}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCE4EC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FCE4EC',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  profileButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileEmoji: {
    fontSize: 24,
  },
  heroCard: {
    backgroundColor: '#D4A574',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  heroGreeting: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 4,
    opacity: 0.9,
  },
  heroName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
  },
  babyVisualization: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    marginBottom: 20,
  },
  babyEmoji: {
    fontSize: 100,
    marginBottom: 10,
  },
  babySize: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  dayCounterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayCounter: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  openButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  openButtonArrow: {
    fontSize: 12,
    color: '#1a1a1a',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoWeeks: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  infoTrimester: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoDueDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modernProgressBar: {
    height: 6,
    backgroundColor: '#FFE5EC',
    borderRadius: 3,
    overflow: 'hidden',
  },
  modernProgressFill: {
    height: '100%',
    backgroundColor: '#F06292',
    borderRadius: 3,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  detailLabel: {
    fontSize: 15,
    color: '#666',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  section: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginTop: 100,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});
