import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { initializeWeekData } from '../../services/firebase/weekInfoService';

export default function AdminScreen() {
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const handleInitialize = async () => {
    Alert.alert(
      'Initialize Week Data',
      'This will populate Firestore with pregnancy week information for weeks 4, 8, 12, 16, 20, 24, 28, 32, 36, and 40. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Initialize',
          onPress: async () => {
            try {
              setLoading(true);
              await initializeWeekData();
              setInitialized(true);
              Alert.alert('Success!', 'Pregnancy week data has been initialized in Firestore.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to initialize data');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Setup</Text>
        <Text style={styles.subtitle}>Initialize pregnancy week information</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📚 Pregnancy Week Data</Text>
        <Text style={styles.cardDescription}>
          Initialize the Firestore database with pregnancy week information including baby development, mother changes, and tips for each week.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>What will be created:</Text>
          <Text style={styles.infoItem}>• 10 week documents (4, 8, 12, 16, 20, 24, 28, 32, 36, 40)</Text>
          <Text style={styles.infoItem}>• Baby size, length, and weight data</Text>
          <Text style={styles.infoItem}>• Baby development milestones</Text>
          <Text style={styles.infoItem}>• Mother changes and symptoms</Text>
          <Text style={styles.infoItem}>• Weekly tips and recommendations</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, (loading || initialized) && styles.buttonDisabled]}
          onPress={handleInitialize}
          disabled={loading || initialized}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {initialized ? '✓ Data Initialized' : 'Initialize Week Data'}
            </Text>
          )}
        </TouchableOpacity>

        {initialized && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              ✓ Data successfully initialized! You can now see week-specific information on the home screen.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.warningCard}>
        <Text style={styles.warningTitle}>⚠️ Important Notes</Text>
        <Text style={styles.warningText}>
          • This only needs to be run once{'\n'}
          • If data already exists, it will be overwritten{'\n'}
          • You can verify the data in Firebase Console under the "pregnancyWeeks" collection{'\n'}
          • After initialization, you can delete this admin screen
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoItem: {
    fontSize: 13,
    color: '#666',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successBox: {
    backgroundColor: '#d4edda',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  successText: {
    fontSize: 14,
    color: '#155724',
    lineHeight: 20,
  },
  warningCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 12,
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 20,
  },
});
