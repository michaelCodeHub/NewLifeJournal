import { Tabs } from 'expo-router';

export default function PregnancyLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Pregnancy Journey',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <span style={{ fontSize: 24 }}>🏠</span>,
        }}
      />
      <Tabs.Screen
        name="visits"
        options={{
          title: 'Hospital Visits',
          tabBarLabel: 'Visits',
          tabBarIcon: ({ color }) => <span style={{ fontSize: 24 }}>🏥</span>,
        }}
      />
      <Tabs.Screen
        name="symptoms"
        options={{
          title: 'Symptoms',
          tabBarLabel: 'Symptoms',
          tabBarIcon: ({ color }) => <span style={{ fontSize: 24 }}>💊</span>,
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: 'Timeline',
          tabBarLabel: 'Timeline',
          tabBarIcon: ({ color }) => <span style={{ fontSize: 24 }}>📅</span>,
        }}
      />
    </Tabs>
  );
}
