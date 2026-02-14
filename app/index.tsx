import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    // Determine where to navigate based on auth state
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    const inPregnancyGroup = segments[0] === '(pregnancy)';
    const inBabyGroup = segments[0] === '(baby)';

    if (!user && !inAuthGroup) {
      // User is not signed in, redirect to login
      router.replace('/(auth)/login');
    } else if (user && userProfile) {
      // User is signed in, check their current mode
      if (userProfile.currentMode === 'pregnancy' && !inPregnancyGroup) {
        router.replace('/(pregnancy)/home');
      } else if (userProfile.currentMode === 'baby' && !inBabyGroup) {
        router.replace('/(baby)/home');
      } else if (!userProfile.currentMode && !inOnboardingGroup) {
        // User hasn't set up pregnancy or baby yet
        router.replace('/(onboarding)/choose-mode');
      }
    } else if (user && !userProfile && !inOnboardingGroup) {
      // User is signed in but profile not loaded yet, go to onboarding
      router.replace('/(onboarding)/choose-mode');
    }
  }, [user, userProfile, loading, segments]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
