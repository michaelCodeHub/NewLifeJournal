import { Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

/**
 * Pregnancy mode = a native stack.
 *  - `(tabs)` holds the five root tabs (Home, Timeline, Ask, Tools, You).
 *  - Every other screen (visits, symptoms, kick counter, ...) is pushed on top
 *    with a native slide, and gets a back button via <Screen header={{ variant: 'bar' }}>.
 */
export default function PregnancyLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="paywall" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
