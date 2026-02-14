import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function ChooseModeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to NewLifeJournal!</Text>
      <Text style={styles.subtitle}>
        What would you like to track?
      </Text>

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => router.push('/(onboarding)/create-pregnancy')}
        >
          <Text style={styles.optionIcon}>🤰</Text>
          <Text style={styles.optionTitle}>Track Pregnancy</Text>
          <Text style={styles.optionDescription}>
            Monitor your pregnancy journey, hospital visits, and symptoms
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => router.push('/(onboarding)/create-baby')}
        >
          <Text style={styles.optionIcon}>👶</Text>
          <Text style={styles.optionTitle}>Add Baby</Text>
          <Text style={styles.optionDescription}>
            Track your baby's activities, growth, and milestones
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 24,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  optionIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
