import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { usePregnancy } from '../../context/PregnancyContext';

export default function TimelineScreen() {
  const { pregnancy, hospitalVisits, symptoms, milestones, loading } = usePregnancy();

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
        <Text style={styles.emptyText}>No active pregnancy</Text>
      </View>
    );
  }

  // Combine all events into a single timeline
  const timelineEvents = [
    ...hospitalVisits.map((visit) => ({
      id: visit.id,
      type: 'visit' as const,
      date: visit.date.toDate(),
      week: visit.week,
      title: visit.type,
      icon: '🏥',
      notes: visit.notes,
    })),
    ...symptoms.map((symptom) => ({
      id: symptom.id,
      type: 'symptom' as const,
      date: symptom.date.toDate(),
      week: symptom.week,
      title: symptom.type.replace('_', ' '),
      icon: '💊',
      severity: symptom.severity,
      notes: symptom.notes,
    })),
    ...milestones.map((milestone) => ({
      id: milestone.id,
      type: 'milestone' as const,
      date: milestone.date.toDate(),
      week: milestone.week,
      title: milestone.title,
      icon: '⭐',
      description: milestone.description,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerTitle}>Your Pregnancy Timeline</Text>

      {timelineEvents.length > 0 ? (
        <View style={styles.timeline}>
          {timelineEvents.map((event, index) => (
            <View key={event.id} style={styles.timelineItem}>
              <View style={styles.timelineDot}>
                <Text style={styles.timelineIcon}>{event.icon}</Text>
              </View>
              {index < timelineEvents.length - 1 && (
                <View style={styles.timelineLine} />
              )}
              <View style={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventWeek}>Week {event.week}</Text>
                </View>
                <Text style={styles.eventDate}>
                  {event.date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                {'severity' in event && (
                  <View style={styles.severityContainer}>
                    <Text style={styles.severityLabel}>Severity:</Text>
                    <View style={styles.severityDots}>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <View
                          key={level}
                          style={[
                            styles.severityDot,
                            level <= event.severity && styles.severityDotActive,
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                )}
                {(event.notes || event.description) && (
                  <Text style={styles.eventNotes}>
                    {event.notes || event.description}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyText}>Your timeline is empty</Text>
          <Text style={styles.emptySubtext}>
            Start logging visits, symptoms, and milestones
          </Text>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 24,
  },
  timeline: {
    position: 'relative',
  },
  timelineItem: {
    position: 'relative',
    marginBottom: 24,
    paddingLeft: 60,
  },
  timelineDot: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineIcon: {
    fontSize: 24,
  },
  timelineLine: {
    position: 'absolute',
    left: 23,
    top: 48,
    bottom: -24,
    width: 2,
    backgroundColor: '#E3F2FD',
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    textTransform: 'capitalize',
  },
  eventWeek: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  severityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  severityLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  severityDots: {
    flexDirection: 'row',
    gap: 4,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  severityDotActive: {
    backgroundColor: '#FF9800',
  },
  eventNotes: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
