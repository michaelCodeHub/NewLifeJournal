import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function ChooseModeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to{'\n'}NewLifeJournal! 🌱</Text>
      <Text style={styles.subtitle}>What would you like to track?</Text>

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => router.push('/(onboarding)/create-pregnancy')}
          activeOpacity={0.85}
        >
          <Text style={styles.optionIcon}>🤰</Text>
          <Text style={styles.optionTitle}>Track Pregnancy</Text>
          <Text style={styles.optionDescription}>
            Monitor your journey, hospital visits, symptoms, and get weekly updates
          </Text>
          <View style={styles.optionChevron}>
            <Text style={styles.optionChevronText}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => router.push('/(onboarding)/create-baby')}
          activeOpacity={0.85}
        >
          <Text style={styles.optionIcon}>👶</Text>
          <Text style={styles.optionTitle}>Add Baby</Text>
          <Text style={styles.optionDescription}>
            Track your baby's activities, growth milestones, and daily care
          </Text>
          <View style={styles.optionChevron}>
            <Text style={styles.optionChevronText}>›</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#E8F4F5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 36,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(129, 190, 193, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  optionIcon: {
    fontSize: 48,
    marginBottom: 14,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 21,
  },
  optionChevron: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -14,
  },
  optionChevronText: {
    fontSize: 28,
    color: '#81bec1',
    fontWeight: '300',
  },
});
