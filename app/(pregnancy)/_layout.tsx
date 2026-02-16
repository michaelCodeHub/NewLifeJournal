import { Tabs } from 'expo-router';
import { Text } from 'react-native';

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
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="visits"
        options={{
          title: 'Hospital Visits',
          tabBarLabel: 'Visits',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🏥</Text>,
        }}
      />
      <Tabs.Screen
        name="symptoms"
        options={{
          title: 'Symptoms',
          tabBarLabel: 'Symptoms',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>💊</Text>,
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: 'Timeline',
          tabBarLabel: 'Timeline',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📅</Text>,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'AI Assistant',
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>💬</Text>,
        }}
      />
    </Tabs>
  );
}
