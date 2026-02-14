import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen
        name="choose-mode"
        options={{
          title: 'Get Started',
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="create-pregnancy"
        options={{ title: 'Create Pregnancy Profile' }}
      />
      <Stack.Screen
        name="create-baby"
        options={{ title: 'Add Baby Profile' }}
      />
    </Stack>
  );
}
