import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { usePregnancy } from '../../context/PregnancyContext';

export default function HospitalVisitsScreen() {
  const { pregnancy, hospitalVisits, loading } = usePregnancy();
  const [showAddForm, setShowAddForm] = useState(false);

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hospital Visits</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddForm(true)}
        >
          <Text style={styles.addButtonText}>+ Add Visit</Text>
        </TouchableOpacity>
      </View>

      {/* Visits List */}
      {hospitalVisits.length > 0 ? (
        <View style={styles.visitsList}>
          {hospitalVisits.map((visit) => (
            <View key={visit.id} style={styles.visitCard}>
              <View style={styles.visitHeader}>
                <Text style={styles.visitType}>{visit.type}</Text>
                <Text style={styles.visitWeek}>Week {visit.week}</Text>
              </View>
              <Text style={styles.visitDate}>
                {visit.date.toDate().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              {visit.notes && (
                <Text style={styles.visitNotes}>{visit.notes}</Text>
              )}
              {visit.weight && (
                <Text style={styles.visitDetail}>Weight: {visit.weight} kg</Text>
              )}
              {visit.bloodPressure && (
                <Text style={styles.visitDetail}>BP: {visit.bloodPressure}</Text>
              )}
              {visit.nextVisitDate && (
                <View style={styles.nextVisit}>
                  <Text style={styles.nextVisitLabel}>Next Visit:</Text>
                  <Text style={styles.nextVisitDate}>
                    {visit.nextVisitDate.toDate().toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🏥</Text>
          <Text style={styles.emptyText}>No hospital visits yet</Text>
          <Text style={styles.emptySubtext}>
            Track your checkups, ultrasounds, and appointments
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
  visitsList: {
    gap: 12,
  },
  visitCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  visitType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    textTransform: 'capitalize',
  },
  visitWeek: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  visitDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  visitNotes: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  visitDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  nextVisit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  nextVisitLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginRight: 8,
  },
  nextVisitDate: {
    fontSize: 12,
    color: '#007AFF',
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
