import { Stack } from 'expo-router';
import { pushAnimation } from '../../constants/navigation';
import { useTheme } from '../../context/ThemeContext';

/**
 * Baby mode = a native stack, same shape as pregnancy mode:
 *  - `(tabs)` holds the five root tabs (Home, Timeline, Tools, Ask, You).
 *  - growth, health, edit baby and the pregnancy journal are pushed on top.
 * Shared screens (paywall, community, moderation, blocked) live under
 * (pregnancy) and are pushed from here as-is.
 */
export default function BabyLayout() {
  const { colors } = useTheme();
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
    </Stack>
  );
}
