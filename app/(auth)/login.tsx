import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { auth, db } from '../../config/firebase';

// Dev-only test login, available only when running against the local emulators.
const DEV_LOGIN_ENABLED = process.env.EXPO_PUBLIC_USE_EMULATOR === '1';

export default function LoginScreen() {
  const { signIn, loading } = useAuth();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleDevSignIn = async () => {
    console.log('🔧 dev login: start');
    setIsSigningIn(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, 'devtest@newlifejournal.test', 'DevTest12345!');
      // Mirror the real Google flow, which creates the user profile doc on sign-in.
      await setDoc(
        doc(db, 'users', cred.user.uid),
        {
          email: cred.user.email || 'devtest@newlifejournal.test',
          name: 'Dev Test',
          createdAt: Timestamp.now(),
          lastLogin: Timestamp.now(),
          currentMode: null,
        },
        { merge: true }
      );
      console.log('🔧 dev login: success', cred.user.uid);
      router.replace('/(onboarding)/choose-mode');
    } catch (err: any) {
      console.log('🔧 dev login: error', err?.code, err?.message);
      Alert.alert('Dev Sign In Failed', err.message || 'Please try again');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    const result = await signIn();
    setIsSigningIn(false);

    if (result.success) {
      // Navigate to onboarding after successful sign in
      router.replace('/(onboarding)/choose-mode');
    } else {
      Alert.alert('Sign In Failed', result.error || 'Please try again');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* App Logo/Icon placeholder */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>👶</Text>
        </View>

        {/* App Title */}
        <Text style={styles.title}>NewLifeJournal</Text>
        <Text style={styles.subtitle}>
          Track your pregnancy journey and baby's growth
        </Text>

        {/* Sign In Button */}
        <TouchableOpacity
          style={styles.signInButton}
          onPress={handleSignIn}
          disabled={isSigningIn || loading}
        >
          {isSigningIn || loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.buttonContent}>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.signInButtonText}>Sign in with Google</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Dev-only test login (emulator mode) */}
        {DEV_LOGIN_ENABLED && (
          <TouchableOpacity
            style={styles.devButton}
            onPress={handleDevSignIn}
            disabled={isSigningIn || loading}
            testID="dev-login"
          >
            <Text style={styles.devButtonText}>🔧 Dev Test Login</Text>
          </TouchableOpacity>
        )}

        {/* Privacy Notice */}
        <Text style={styles.privacyText}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 48,
    paddingHorizontal: 16,
  },
  signInButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    backgroundColor: '#fff',
    color: '#4285F4',
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
    borderRadius: 4,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 32,
  },
  devButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF9800',
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  devButtonText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
  },
});
