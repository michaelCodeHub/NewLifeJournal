import { Stack } from 'expo-router';
import { pushAnimation } from '../../constants/navigation';
import { useTheme } from '../../context/ThemeContext';

export default function OnboardingLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: pushAnimation(),
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
