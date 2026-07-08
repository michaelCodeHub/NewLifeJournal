import { useEffect } from 'react';
import { Stack, usePathname } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { PregnancyProvider } from '../context/PregnancyContext';
import { ChatbotProvider } from '../context/ChatbotContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import { ThemeProvider } from '../context/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { initMonitoring } from '../services/monitoring/firebaseInit';
import { trackScreen } from '../services/monitoring/analytics';

// Fires a screen_view analytics event whenever the route changes. Lives here
// (rather than in every screen file) so every route gets covered for free.
function ScreenViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) trackScreen(pathname);
  }, [pathname]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    initMonitoring();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          {/* Needs useAuth (uid) but not pregnancy data, so it wraps PregnancyProvider
              and sits above ChatbotProvider, which meters free-tier AI usage. */}
          <SubscriptionProvider>
            <PregnancyProvider>
              <ChatbotProvider>
                <StatusBar style="auto" />
                <ScreenViewTracker />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(onboarding)" />
                  <Stack.Screen name="(pregnancy)" />
                  <Stack.Screen name="(baby)" />
                </Stack>
              </ChatbotProvider>
            </PregnancyProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
