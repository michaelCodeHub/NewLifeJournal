import { Tabs } from 'expo-router';

export default function BabyLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Baby',
          tabBarLabel: 'Home',
        }}
      />
    </Tabs>
  );
}
