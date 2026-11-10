import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { auth, db } from '../../config/firebase';
import { useTheme, SPACE, RADIUS, GUTTER } from '../../context/ThemeContext';
import { BrandLogo, Button, SegmentedControl, Sheet, Text, TextField, Card, IconTile, useToast } from '../../components/ui';
import * as WebBrowser from 'expo-web-browser';
import { LEGAL } from '../../constants/legal';

// Dev-only test login, available only when running against the local emulators.
const DEV_LOGIN_ENABLED = process.env.EXPO_PUBLIC_USE_EMULATOR === '1';

type AuthMode = 'signin' | 'signup';

const friendlyError = (msg?: string) => {
  if (!msg) return 'Something went wrong. Please try again.';
  if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential'))
    return 'That email and password don’t match.';
  if (msg.includes('email-already-in-use')) return 'An account with this email already exists. Sign in instead.';
  if (msg.includes('invalid-email')) return 'Enter a valid email address.';
  if (msg.includes('too-many-requests')) return 'Too many attempts. Wait a minute and try again.';
  if (msg.includes('network')) return 'You appear to be offline. Check your connection and try again.';
  return msg;
};

/**
 * Sign in / create account. Navigation after success is handled by the AuthGate
 * in app/_layout.tsx, so returning users land on Home, not onboarding.
 */
export default function LoginScreen() {
  const { signIn, signInEmail, signUpEmail, resetPassword } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState<null | 'email' | 'google' | 'dev'>(null);
  const [formError, setFormError] = useState<string | undefined>();
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [verifySentTo, setVerifySentTo] = useState<string | null>(null);

  const switchMode = (m: AuthMode) => {
    setMode(m);
    setPassword('');
    setConfirm('');
    setFormError(undefined);
  };

  const handleEmail = async () => {
    setFormError(undefined);
    if (!email.trim() || !password) return setFormError('Enter your email and password.');
    if (mode === 'signup') {
      if (password.length < 8) return setFormError('Use at least 8 characters for your password.');
      if (password !== confirm) return setFormError('Passwords don’t match.');
    }
    setBusy('email');
    const result = mode === 'signin' ? await signInEmail(email.trim(), password) : await signUpEmail(email.trim(), password);
    setBusy(null);
    if (!result.success) return setFormError(friendlyError(result.error));
    if (mode === 'signup') setVerifySentTo(email.trim());
  };

  const handleGoogle = async () => {
    setBusy('google');
    const result = await signIn();
    setBusy(null);
    if (!result.success) toast.show(friendlyError(result.error), 'error');
  };

  const handleDev = async () => {
    setBusy('dev');
    try {
      const cred = await signInWithEmailAndPassword(auth, 'devtest@newlifejournal.test', 'DevTest12345!');
      const ref = doc(db, 'users', cred.user.uid);
      const existing = await getDoc(ref);
      // Only seed the profile once; re-writing currentMode: null sent returning
      // dev users back to onboarding every time.
      if (!existing.exists()) {
        await setDoc(ref, {
          email: cred.user.email || 'devtest@newlifejournal.test',
          name: 'Dev Test',
          createdAt: Timestamp.now(),
          lastLogin: Timestamp.now(),
          currentMode: null,
        });
      }
    } catch (err: any) {
      toast.show(err?.message || 'Dev sign in failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleReset = async () => {
    if (!resetEmail.trim()) return;
    setResetBusy(true);
    const result = await resetPassword(resetEmail.trim());
    setResetBusy(false);
    if (result.success) {
      setForgotOpen(false);
      setResetEmail('');
      toast.show('Reset link sent. Check your inbox.');
    } else {
      toast.show(friendlyError(result.error), 'error');
    }
  };

  if (verifySentTo) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Card style={styles.verifyCard}>
          <IconTile name="mail-unread-outline" tone="teal" size={52} />
          <Text variant="title2" align="center">
            Check your email
          </Text>
          <Text variant="callout" color="textSecondary" align="center">
            We sent a verification link to <Text variant="calloutMedium">{verifySentTo}</Text>. Open it to activate your
            account, then sign in.
          </Text>
          <Button
            title="Back to sign in"
            fullWidth
            onPress={() => {
              setVerifySentTo(null);
              switchMode('signin');
            }}
          />
        </Card>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + SPACE.huge, paddingBottom: insets.bottom + SPACE.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <BrandLogo height={100} />
          <Text variant="callout" color="textSecondary" align="center">
            Your pregnancy, week by week. Private by default.
          </Text>
        </View>

        <Card style={styles.form}>
          <SegmentedControl<AuthMode>
            value={mode}
            onChange={switchMode}
            options={[
              { value: 'signin', label: 'Sign in' },
              { value: 'signup', label: 'Create account' },
            ]}
          />
          <TextField
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            label="Password"
            placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
            secureTextEntry
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            textContentType={mode === 'signup' ? 'newPassword' : 'password'}
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={mode === 'signin' ? handleEmail : undefined}
          />
          {mode === 'signup' ? (
            <TextField
              label="Confirm password"
              placeholder="Type it again"
              secureTextEntry
              autoComplete="new-password"
              value={confirm}
              onChangeText={setConfirm}
              onSubmitEditing={handleEmail}
            />
          ) : null}
          {formError ? (
            <Text variant="footnote" color="red">
              {formError}
            </Text>
          ) : null}
          <Button
            title={mode === 'signin' ? 'Sign in' : 'Create account'}
            size="lg"
            fullWidth
            loading={busy === 'email'}
            disabled={!!busy && busy !== 'email'}
            onPress={handleEmail}
          />
          {mode === 'signin' ? (
            <Button
              title="Forgot password?"
              variant="ghost"
              size="sm"
              onPress={() => {
                setResetEmail(email);
                setForgotOpen(true);
              }}
            />
          ) : null}
        </Card>

        <View style={styles.dividerRow}>
          <View style={[styles.hr, { backgroundColor: colors.border }]} />
          <Text variant="caption" color="textMuted">
            or
          </Text>
          <View style={[styles.hr, { backgroundColor: colors.border }]} />
        </View>

        <View style={{ gap: SPACE.sm }}>
          <Button
            title="Continue with Google"
            icon="logo-google"
            variant="secondary"
            size="lg"
            fullWidth
            loading={busy === 'google'}
            disabled={!!busy && busy !== 'google'}
            onPress={handleGoogle}
          />
          {DEV_LOGIN_ENABLED ? (
            <Button
              title="Dev test login"
              icon="construct-outline"
              variant="tinted"
              size="lg"
              fullWidth
              loading={busy === 'dev'}
              disabled={!!busy && busy !== 'dev'}
              onPress={handleDev}
            />
          ) : null}
        </View>

        <Text variant="caption" color="textMuted" align="center" style={styles.legal}>
          By continuing you agree to the{' '}
          <Text
            variant="caption"
            color="primaryDark"
            accessibilityRole="link"
            onPress={LEGAL.termsUrl ? () => WebBrowser.openBrowserAsync(LEGAL.termsUrl!) : undefined}
          >
            Terms of Service
          </Text>{' '}
          and{' '}
          <Text
            variant="caption"
            color="primaryDark"
            accessibilityRole="link"
            onPress={LEGAL.privacyUrl ? () => WebBrowser.openBrowserAsync(LEGAL.privacyUrl!) : undefined}
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </ScrollView>

      <Sheet
        visible={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset password"
        subtitle="We'll email you a link to choose a new one."
        footer={<Button title="Send reset link" size="lg" fullWidth loading={resetBusy} onPress={handleReset} />}
      >
        <TextField
          label="Email"
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={resetEmail}
          onChangeText={setResetEmail}
          autoFocus
        />
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: GUTTER, gap: SPACE.xxl, maxWidth: 480, width: '100%', alignSelf: 'center' },
  brand: { alignItems: 'center', gap: SPACE.sm },
  form: { gap: SPACE.lg },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  hr: { flex: 1, height: StyleSheet.hairlineWidth * 2 },
  legal: { paddingHorizontal: SPACE.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: GUTTER },
  verifyCard: { gap: SPACE.md, alignItems: 'center', maxWidth: 420, width: '100%', padding: SPACE.xxl },
});
