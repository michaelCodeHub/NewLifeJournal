import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { PregnancyProvider } from '../context/PregnancyContext';
import { BabyProvider } from '../context/BabyContext';
import { ChatbotProvider } from '../context/ChatbotContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ToastProvider } from '../components/ui/Toast';
import { initMonitoring } from '../services/monitoring/firebaseInit';
import { applyAnalyticsConsent, trackScreen } from '../services/monitoring/analytics';
import { loadConsent } from '../services/monitoring/consent';
import { BABY_MODE_ENABLED } from '../constants/features';

// Keep the native splash up until the first real screen is ready, then fade it
// out. Without this the splash vanished immediately and the app flashed a blank
// frame, then the loading screen, then the destination screen.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 280 });

let splashHidden = false;
/** Hides the splash once, two frames after a route change so the new screen has painted. */
function hideSplash() {
  if (splashHidden) return;
  splashHidden = true;
  requestAnimationFrame(() => requestAnimationFrame(() => SplashScreen.hideAsync().catch(() => {})));
}

// Fires a screen_view analytics event whenever the route changes. Lives here
// (rather than in every screen file) so every route gets covered for free.
function ScreenViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) trackScreen(pathname);
  }, [pathname]);
  return null;
}

/**
 * The single place that decides where a user belongs. It reacts to auth and
 * profile state, so screens (login, onboarding) never have to navigate after
 * signing in, which used to race and send returning users to onboarding.
 *
 *  - signed out              -> /login
 *  - signed in, on login/splash -> their mode's home, or onboarding if none
 *  - everything else is left alone (onboarding flows navigate themselves)
 */
function AuthGate() {
  const { user, userProfile, loading, profileLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading || profileLoading) return;
    const group = segments[0];
    const atEntry = !group || group === '(auth)';

    if (!user) {
      if (group !== '(auth)') router.replace('/(auth)/login');
      hideSplash();
      return;
    }
    if (!atEntry) {
      hideSplash();
      return;
    }

    // Baby mode can be switched off (constants/features.ts); its users then land
    // on the pregnancy journal instead.
    const mode = userProfile?.currentMode;
    if (mode === 'baby' && BABY_MODE_ENABLED) router.replace('/(baby)/(tabs)/home');
    else if (mode === 'pregnancy' || mode === 'baby') router.replace('/(pregnancy)/(tabs)/home');
    else router.replace(BABY_MODE_ENABLED ? '/(onboarding)/choose-mode' : '/(onboarding)/create-pregnancy');
    hideSplash();
  }, [user, userProfile?.currentMode, loading, profileLoading, segments, router]);

  return null;
}

// On a desktop browser, show the app as a centred phone-width column instead of
// stretching every control across the whole window. No effect on iOS/Android.
const WEB_APP_WIDTH = 480;

/**
 * Everything outside our own views follows the app theme too — not the OS theme:
 *  - native: the root window background (seen behind screens, keyboard, transitions);
 *  - web: page background, `color-scheme` (native inputs, scrollbars, date picker),
 *    and `theme-color` (mobile browser address bar / app frame).
 */
function useSystemChrome(background: string, frame: string, isDark: boolean) {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      SystemUI.setBackgroundColorAsync(background).catch(() => {});
      return;
    }
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    html.style.backgroundColor = frame;
    html.style.colorScheme = isDark ? 'dark' : 'light';
    document.body.style.backgroundColor = frame;
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = background;
  }, [background, frame, isDark]);
}

function ThemedShell() {
  const { colors, isDark, ready } = useTheme();
  const isWeb = Platform.OS === 'web';
  // One continuous canvas: on desktop web the page around the phone-width column
  // is the same colour as the app, so the app doesn't look like a box on grey.
  useSystemChrome(colors.background, colors.background, isDark);
  // Wait for the saved appearance so a dark-mode user never sees a light first frame.
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
    <View
      style={
        isWeb
          ? {
              flex: 1,
              width: '100%',
              maxWidth: WEB_APP_WIDTH,
              alignSelf: 'center',
              backgroundColor: colors.background,
              overflow: 'hidden',
            }
          : { flex: 1, backgroundColor: colors.background }
      }
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScreenViewTracker />
      <AuthGate />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(pregnancy)" />
        <Stack.Screen name="(baby)" />
      </Stack>
    </View>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    initMonitoring();
    // Analytics stays off until the user opts in (Profile → Privacy).
    loadConsent().then((c) => applyAnalyticsConsent(c.analytics));
    // Safety net: never leave the splash up if auth or the network stalls.
    const t = setTimeout(hideSplash, 8000);
    return () => clearTimeout(t);
  }, []);

  // Hold the first frame until Inter is ready so text never jumps between fonts.
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            {/* Needs useAuth (uid) but not pregnancy data, so it wraps PregnancyProvider
                and sits above ChatbotProvider, which meters free-tier AI usage. */}
            <SubscriptionProvider>
              <PregnancyProvider>
                <BabyProvider>
                  <ChatbotProvider>
                    <ToastProvider>
                      <ThemedShell />
                    </ToastProvider>
                  </ChatbotProvider>
                </BabyProvider>
              </PregnancyProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
