import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { useTheme, SPACE, RADIUS, GUTTER } from '../../context/ThemeContext';
import {
  BrandTile,
  Button,
  IconButton,
  PressableScale,
  Sheet,
  Text,
  TextField,
  useToast,
} from '../../components/ui';
import * as WebBrowser from 'expo-web-browser';
import { LEGAL } from '../../constants/legal';
import { Icon } from '../../components/ui/Icon';

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
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<null | 'email' | 'google'>(null);
  const [formError, setFormError] = useState<string | undefined>();
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  const isSignIn = mode === 'signin';
  const anyBusy = !!busy;

  const switchMode = (m: AuthMode) => {
    setMode(m);
    setPassword('');
    setConfirm('');
    setShowPassword(false);
    setFormError(undefined);
  };

  /** Clears the inline error as soon as the person starts fixing it. */
  const edit = (set: (v: string) => void) => (v: string) => {
    set(v);
    if (formError) setFormError(undefined);
  };

  const handleEmail = async () => {
    setFormError(undefined);
    if (!email.trim() || !password) return setFormError('Enter your email and password.');
    if (!isSignIn) {
      if (password.length < 8) return setFormError('Use at least 8 characters for your password.');
      if (password !== confirm) return setFormError('Passwords don’t match.');
    }
    setBusy('email');
    const result = isSignIn ? await signInEmail(email.trim(), password) : await signUpEmail(email.trim(), password);
    setBusy(null);
    if (!result.success) return setFormError(friendlyError(result.error));
    // Firebase signs the new account in straight away and AuthGate moves on to
    // onboarding; the verification email is a courtesy, not a gate.
    if (!isSignIn) toast.show(`Account created. We sent a verification link to ${email.trim()}.`);
  };

  const handleGoogle = async () => {
    setBusy('google');
    const result = await signIn();
    setBusy(null);
    if (!result.success) toast.show(friendlyError(result.error), 'error');
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + SPACE.xxxl, paddingBottom: insets.bottom + SPACE.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.top}>
          <BrandTile size={44} />

          <Animated.View key={mode} entering={FadeIn.duration(220)} style={styles.heading}>
            <Text variant="display">{isSignIn ? 'Welcome back' : 'Create your account'}</Text>
            <Text variant="body" color="textSecondary">
              {isSignIn
                ? 'Sign in to pick up your pregnancy journal where you left off.'
                : 'Keep visits, symptoms and milestones in one calm, private place.'}
            </Text>
          </Animated.View>

          <View style={styles.form}>
            <Button
              title="Continue with Google"
              icon="logo-google"
              variant="secondary"
              size="lg"
              fullWidth
              loading={busy === 'google'}
              disabled={anyBusy && busy !== 'google'}
              onPress={handleGoogle}
            />

            <View style={styles.dividerRow}>
              <View style={[styles.hr, { backgroundColor: colors.border }]} />
              <Text variant="caption" color="textMuted">
                or with email
              </Text>
              <View style={[styles.hr, { backgroundColor: colors.border }]} />
            </View>

            <TextField
              label="Email"
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={edit(setEmail)}
            />
            <TextField
              label="Password"
              action={
                isSignIn
                  ? {
                      label: 'Forgot password?',
                      onPress: () => {
                        setResetEmail(email);
                        setForgotOpen(true);
                      },
                    }
                  : undefined
              }
              placeholder={isSignIn ? 'Your password' : 'At least 8 characters'}
              secureTextEntry={!showPassword}
              autoComplete={isSignIn ? 'current-password' : 'new-password'}
              textContentType={isSignIn ? 'password' : 'newPassword'}
              value={password}
              onChangeText={edit(setPassword)}
              onSubmitEditing={isSignIn ? handleEmail : undefined}
              trailing={
                <IconButton
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  variant="plain"
                  size={28}
                  color="textMuted"
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                />
              }
            />
            {!isSignIn ? (
              <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(120)}>
                <TextField
                  label="Confirm password"
                  placeholder="Type it again"
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  value={confirm}
                  onChangeText={edit(setConfirm)}
                  onSubmitEditing={handleEmail}
                />
              </Animated.View>
            ) : null}

            {formError ? (
              <Animated.View
                entering={FadeIn.duration(180)}
                style={[styles.error, { backgroundColor: colors.redTint }]}
                accessibilityLiveRegion="polite"
              >
                <Icon name="alert-circle-outline" size={16} color={colors.red} />
                <Text variant="callout" color="red" style={{ flex: 1 }}>
                  {formError}
                </Text>
              </Animated.View>
            ) : null}

            <Button
              title={isSignIn ? 'Sign in' : 'Create account'}
              size="lg"
              fullWidth
              loading={busy === 'email'}
              disabled={anyBusy && busy !== 'email'}
              onPress={handleEmail}
              style={{ marginTop: SPACE.xs }}
            />

            <View style={styles.trust}>
              <Icon name="lock-closed-outline" size={16} color={colors.textMuted} />
              <Text variant="footnote" color="textMuted">
                Private by default. Only you can see your journal.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottom}>
          <View style={styles.switch}>
            <Text variant="callout" color="textSecondary">
              {isSignIn ? 'New to Bloom & Bump?' : 'Already have an account?'}
            </Text>
            {/* Only the link words are tappable; the slop adds height, not width into the question. */}
            <PressableScale
              onPress={() => switchMode(isSignIn ? 'signup' : 'signin')}
              scaleTo={0.97}
              hitSlop={SWITCH_HIT_SLOP}
              accessibilityLabel={isSignIn ? 'Create an account' : 'Sign in instead'}
            >
              <Text variant="calloutMedium" color="primaryDark">
                {isSignIn ? 'Create an account' : 'Sign in'}
              </Text>
            </PressableScale>
          </View>

          <Text variant="caption" color="textMuted" align="center" style={styles.legal}>
            By continuing you agree to our{' '}
            <Text
              variant="caption"
              color="textSecondary"
              accessibilityRole="link"
              style={styles.link}
              onPress={LEGAL.termsUrl ? () => WebBrowser.openBrowserAsync(LEGAL.termsUrl!) : undefined}
            >
              Terms
            </Text>{' '}
            and{' '}
            <Text
              variant="caption"
              color="textSecondary"
              accessibilityRole="link"
              style={styles.link}
              onPress={LEGAL.privacyUrl ? () => WebBrowser.openBrowserAsync(LEGAL.privacyUrl!) : undefined}
            >
              Privacy Policy
            </Text>
            .
          </Text>

        </View>
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

/** Taller tap target for the "Create an account" / "Sign in" link without reaching into the question. */
const SWITCH_HIT_SLOP = { top: 12, bottom: 12, left: 2, right: 8 };

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: SPACE.xxxl,
    paddingHorizontal: GUTTER + 4,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  top: { gap: SPACE.xxl },
  heading: { gap: SPACE.sm },
  form: { gap: SPACE.lg },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  hr: { flex: 1, height: StyleSheet.hairlineWidth * 2 },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.sm,
    paddingVertical: SPACE.sm + 2,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.sm,
  },
  trust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.xs + 2 },
  bottom: { alignItems: 'center', gap: SPACE.md },
  switch: { flexDirection: 'row', gap: SPACE.xs, alignItems: 'center', paddingVertical: SPACE.xs },
  legal: { paddingHorizontal: SPACE.xl },
  link: { textDecorationLine: 'underline' },
  verify: { gap: SPACE.xxl, alignItems: 'center', maxWidth: 400, width: '100%' },
});
