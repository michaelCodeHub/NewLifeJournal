import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { usePregnancy } from '../../context/PregnancyContext';

export default function SymptomsScreen() {
  const { pregnancy, symptoms, loading } = usePregnancy();

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

  const getSeverityColor = (severity: number) => {
    if (severity <= 2) return '#4CAF50';
    if (severity <= 3) return '#FF9800';
    return '#F44336';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Symptoms</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Add Symptom</Text>
        </TouchableOpacity>
      </View>

      {/* Symptoms List */}
      {symptoms.length > 0 ? (
        <View style={styles.symptomsList}>
          {symptoms.map((symptom) => (
            <View key={symptom.id} style={styles.symptomCard}>
              <View style={styles.symptomHeader}>
                <Text style={styles.symptomType}>
                  {symptom.type.replace('_', ' ')}
                </Text>
                <View
                  style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityColor(symptom.severity) },
                  ]}
                >
                  <Text style={styles.severityText}>{symptom.severity}/5</Text>
                </View>
              </View>
              <View style={styles.symptomInfo}>
                <Text style={styles.symptomDate}>
                  {symptom.date.toDate().toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.symptomWeek}>Week {symptom.week}</Text>
              </View>
              {symptom.notes && (
                <Text style={styles.symptomNotes}>{symptom.notes}</Text>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💊</Text>
          <Text style={styles.emptyText}>No symptoms logged</Text>
          <Text style={styles.emptySubtext}>
            Track how you're feeling throughout your pregnancy
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  symptomsList: {
    gap: 12,
  },
  symptomCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  symptomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  symptomType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    textTransform: 'capitalize',
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  symptomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  symptomDate: {
    fontSize: 14,
    color: '#666',
  },
  symptomWeek: {
    fontSize: 12,
    color: '#007AFF',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  symptomNotes: {
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
