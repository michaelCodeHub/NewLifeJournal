import { Stack } from 'expo-router';
import { pushAnimation } from '../../constants/navigation';
import { useTheme } from '../../context/ThemeContext';
import { useReminderSync } from '../../hooks/useReminderSync';

/**
 * Pregnancy mode = a native stack.
 *  - `(tabs)` holds the five root tabs (Home, Timeline, Ask, Tools, You).
 *  - Every other screen (visits, symptoms, kick counter, ...) is pushed on top
 *    with a native slide, and gets a back button via <Screen header={{ variant: 'bar' }}>.
 */
export default function PregnancyLayout() {
  const { colors } = useTheme();
  useReminderSync();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: pushAnimation(),
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="paywall" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
