import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { usePregnancy } from '../../context/PregnancyContext';
import { useAuth } from '../../context/AuthContext';

export default function PregnancyHomeScreen() {
  const { pregnancy, hospitalVisits, symptoms, loading, getCurrentWeek, getDaysUntilDue } = usePregnancy();
  const { signOut } = useAuth();

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {pregnancy.motherName}!</Text>
        <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Week Card */}
      <View style={styles.weekCard}>
        <View style={styles.weekBadge}>
          <Text style={styles.weekBadgeText}>Week {currentWeek}</Text>
        </View>
        <Text style={styles.weekTitle}>
          {daysUntilDue > 0 ? `${daysUntilDue} days until your due date` : 'Due date has passed'}
        </Text>
        <Text style={styles.weekSubtitle}>
          Due: {pregnancy.dueDate.toDate().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${Math.min((currentWeek / 40) * 100, 100)}%` }]} />
        </View>
        <Text style={styles.progressText}>{currentWeek} of 40 weeks</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>🏥</Text>
            <Text style={styles.actionText}>Log Visit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>💊</Text>
            <Text style={styles.actionText}>Add Symptom</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>⭐</Text>
            <Text style={styles.actionText}>Milestone</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>👶</Text>
            <Text style={styles.actionText}>Baby Info</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>

        {hospitalVisits.length > 0 && (
          <View style={styles.activitySection}>
            <Text style={styles.activityTitle}>Hospital Visits ({hospitalVisits.length})</Text>
            {hospitalVisits.slice(0, 3).map((visit) => (
              <View key={visit.id} style={styles.activityItem}>
                <Text style={styles.activityIcon}>🏥</Text>
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>{visit.type}</Text>
                  <Text style={styles.activityDate}>
                    {visit.date.toDate().toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {symptoms.length > 0 && (
          <View style={styles.activitySection}>
            <Text style={styles.activityTitle}>Recent Symptoms ({symptoms.length})</Text>
            {symptoms.slice(0, 3).map((symptom) => (
              <View key={symptom.id} style={styles.activityItem}>
                <Text style={styles.activityIcon}>💊</Text>
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>
                    {symptom.type} (Severity: {symptom.severity}/5)
                  </Text>
                  <Text style={styles.activityDate}>
                    {symptom.date.toDate().toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {hospitalVisits.length === 0 && symptoms.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>No activity yet</Text>
            <Text style={styles.emptySubtext}>Start logging your pregnancy journey</Text>
          </View>
        )}
      </View>

      {/* Pregnancy Info */}
      {pregnancy.hospital && (
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Hospital</Text>
          <Text style={styles.infoValue}>{pregnancy.hospital}</Text>
        </View>
      )}
      {pregnancy.doctorName && (
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Doctor</Text>
          <Text style={styles.infoValue}>{pregnancy.doctorName}</Text>
          {pregnancy.doctorPhone && (
            <Text style={styles.infoSubvalue}>{pregnancy.doctorPhone}</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  signOutButton: {
    padding: 8,
  },
  signOutText: {
    color: '#007AFF',
    fontSize: 14,
  },
  weekCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  weekBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  weekBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  weekTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  weekSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  activitySection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  infoSubvalue: {
    fontSize: 14,
    color: '#666',
  },
});
