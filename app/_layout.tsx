import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { PregnancyProvider } from '../context/PregnancyContext';
import { ChatbotProvider } from '../context/ChatbotContext';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <AuthProvider>
      <PregnancyProvider>
        <ChatbotProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(pregnancy)" />
            <Stack.Screen name="(baby)" />
          </Stack>
        </ChatbotProvider>
      </PregnancyProvider>
    </AuthProvider>
  );
}
