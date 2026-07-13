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
          headerShown: false,
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="create-pregnancy"
        options={{ title: 'Create Pregnancy Profile' }}
      />
      <Stack.Screen
        name="create-baby"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
