import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { user, userProfile, loading, profileLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Wait for both Firebase auth and Firestore profile fetch to complete
    if (loading || profileLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    const inPregnancyGroup = segments[0] === '(pregnancy)';
    const inBabyGroup = segments[0] === '(baby)';

    if (!user && !inAuthGroup) {
      // Not signed in — go to login
      router.replace('/(auth)/login');
    } else if (user && userProfile) {
      // Fully loaded — route by mode
      if (userProfile.currentMode === 'pregnancy' && !inPregnancyGroup) {
        router.replace('/(pregnancy)/home');
      } else if (userProfile.currentMode === 'baby' && !inBabyGroup) {
        router.replace('/(baby)/home');
      } else if (!userProfile.currentMode && !inOnboardingGroup) {
        // Signed in but no mode chosen yet
        router.replace('/(onboarding)/choose-mode');
      }
    } else if (user && !userProfile && !inOnboardingGroup) {
      // New user — no Firestore profile exists yet
      router.replace('/(onboarding)/choose-mode');
    }
  }, [user, userProfile, loading, profileLoading, segments]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#81bec1" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F4F5',
  },
});
