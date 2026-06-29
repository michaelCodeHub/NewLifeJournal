import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { auth, db } from '../../config/firebase';

// Dev-only test login, available only when running against the local emulators.
const DEV_LOGIN_ENABLED = process.env.EXPO_PUBLIC_USE_EMULATOR === '1';

type AuthMode = 'signin' | 'signup';

export default function LoginScreen() {
  const { signIn, signInEmail, signUpEmail, resetPassword, loading } = useAuth();
  const router = useRouter();

  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Email verification notice
  const [showVerificationNotice, setShowVerificationNotice] = useState(false);

  const handleDevSignIn = async () => {
    setIsSubmitting(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, 'devtest@newlifejournal.test', 'DevTest12345!');
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
      router.replace('/(onboarding)/choose-mode');
    } catch (err: any) {
      Alert.alert('Dev Sign In Failed', err.message || 'Please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    const result = await signIn();
    setIsSubmitting(false);
    if (result.success) {
      router.replace('/(onboarding)/choose-mode');
    } else {
      Alert.alert('Sign In Failed', result.error || 'Please try again');
    }
  };

  const handleEmailSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter your email and password.');
      return;
    }

    if (authMode === 'signup') {
      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'Passwords do not match.');
        return;
      }
      if (password.length < 8) {
        Alert.alert('Weak Password', 'Password must be at least 8 characters.');
        return;
      }
    }

    setIsSubmitting(true);

    if (authMode === 'signin') {
      const result = await signInEmail(email.trim(), password);
      setIsSubmitting(false);
      if (result.success) {
        router.replace('/(onboarding)/choose-mode');
      } else {
        Alert.alert('Sign In Failed', friendlyError(result.error));
      }
    } else {
      const result = await signUpEmail(email.trim(), password);
      setIsSubmitting(false);
      if (result.success) {
        setShowVerificationNotice(true);
      } else {
        Alert.alert('Sign Up Failed', friendlyError(result.error));
      }
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Required', 'Please enter your email address.');
      return;
    }
    setIsSendingReset(true);
    const result = await resetPassword(resetEmail.trim());
    setIsSendingReset(false);
    if (result.success) {
      setShowForgotModal(false);
      setResetEmail('');
      Alert.alert('Email Sent', 'Check your inbox for a password reset link.');
    } else {
      Alert.alert('Error', friendlyError(result.error));
    }
  };

  const friendlyError = (msg?: string) => {
    if (!msg) return 'Something went wrong. Please try again.';
    if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential'))
      return 'Invalid email or password.';
    if (msg.includes('email-already-in-use')) return 'An account with this email already exists.';
    if (msg.includes('invalid-email')) return 'Please enter a valid email address.';
    if (msg.includes('too-many-requests')) return 'Too many attempts. Please try again later.';
    return msg;
  };

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowVerificationNotice(false);
  };

  if (showVerificationNotice) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.logoText}>📧</Text>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            We sent a verification link to{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
            {'\n\n'}Open the link in the email to activate your account, then sign in below.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              setShowVerificationNotice(false);
              setAuthMode('signin');
              setPassword('');
              setConfirmPassword('');
            }}
          >
            <Text style={styles.primaryButtonText}>Go to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>👶</Text>
        </View>
        <Text style={styles.title}>NewLifeJournal</Text>
        <Text style={styles.subtitle}>Track your pregnancy journey and baby's growth</Text>

        {/* Sign In / Sign Up toggle */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, authMode === 'signin' && styles.tabActive]}
            onPress={() => switchMode('signin')}
          >
            <Text style={[styles.tabText, authMode === 'signin' && styles.tabTextActive]}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, authMode === 'signup' && styles.tabActive]}
            onPress={() => switchMode('signup')}
          >
            <Text style={[styles.tabText, authMode === 'signup' && styles.tabTextActive]}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Email / Password form */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
          />
          {authMode === 'signup' && (
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor="#999"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
            />
          )}

          {authMode === 'signin' && (
            <TouchableOpacity
              style={styles.forgotLink}
              onPress={() => {
                setResetEmail(email);
                setShowForgotModal(true);
              }}
            >
              <Text style={styles.forgotLinkText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, (isSubmitting || loading) && styles.buttonDisabled]}
            onPress={handleEmailSubmit}
            disabled={isSubmitting || loading}
          >
            {isSubmitting || loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google Sign In */}
        <TouchableOpacity
          style={[styles.googleButton, (isSubmitting || loading) && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={isSubmitting || loading}
        >
          <View style={styles.buttonContent}>
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </View>
        </TouchableOpacity>

        {/* Dev-only test login (emulator mode) */}
        {DEV_LOGIN_ENABLED && (
          <TouchableOpacity
            style={styles.devButton}
            onPress={handleDevSignIn}
            disabled={isSubmitting || loading}
            testID="dev-login"
          >
            <Text style={styles.devButtonText}>🔧 Dev Test Login</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.privacyText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSubtitle}>
              Enter your email and we'll send you a reset link.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#999"
              value={resetEmail}
              onChangeText={setResetEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <TouchableOpacity
              style={[styles.primaryButton, isSendingReset && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={isSendingReset}
            >
              {isSendingReset ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setShowForgotModal(false);
                setResetEmail('');
              }}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 52,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
    lineHeight: 22,
  },
  emailHighlight: {
    color: '#81bec1',
    fontWeight: '600',
  },
  // Auth mode tabs
  tabRow: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: '#F2F2F2',
    padding: 4,
    width: '100%',
    maxWidth: 320,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
  },
  tabTextActive: {
    color: '#81bec1',
    fontWeight: '700',
  },
  // Form
  form: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#FAFAFA',
    marginBottom: 12,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -4,
  },
  forgotLinkText: {
    color: '#81bec1',
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#81bec1',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    color: '#aaa',
    fontSize: 13,
    paddingHorizontal: 12,
  },
  // Google button
  googleButton: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: '#4285F4',
    color: '#fff',
    width: 22,
    height: 22,
    textAlign: 'center',
    lineHeight: 22,
    borderRadius: 4,
  },
  googleButtonText: {
    color: '#444',
    fontSize: 15,
    fontWeight: '600',
  },
  // Dev button
  devButton: {
    marginTop: 12,
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
  privacyText: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  // Forgot password modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalCancelButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalCancelText: {
    color: '#888',
    fontSize: 15,
  },
});
