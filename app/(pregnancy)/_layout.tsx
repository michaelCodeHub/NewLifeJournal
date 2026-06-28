import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function PregnancyLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#81bec1',
        tabBarInactiveTintColor: '#999',
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
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
          href: null,
        }}
      />
      <Tabs.Screen
        name="symptoms"
        options={{
          title: 'Symptoms',
          tabBarLabel: 'Symptoms',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>💊</Text>,
          href: null,
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
        name="kickcounter"
        options={{
          title: 'Kick Counter',
          tabBarLabel: 'Kicks',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>👶</Text>,
        }}
      />
      <Tabs.Screen
        name="charts"
        options={{
          title: 'Health Charts',
          tabBarLabel: 'Charts',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="contractiontimer"
        options={{
          title: 'Contraction Timer',
          tabBarLabel: 'Contractions',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>⏱️</Text>,
        }}
      />
      <Tabs.Screen
        name="checklist"
        options={{
          title: 'Baby Checklist',
          tabBarLabel: 'Checklist',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>✅</Text>,
        }}
      />
      <Tabs.Screen
        name="export"
        options={{
          title: 'Export Report',
          tabBarLabel: 'Export',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📄</Text>,
        }}
      />
      <Tabs.Screen
        name="birthplan"
        options={{
          title: 'Birth Plan',
          tabBarLabel: 'Birth Plan',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📝</Text>,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarLabel: 'Community',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>👥</Text>,
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
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin Setup',
          tabBarLabel: 'Admin',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>⚙️</Text>,
          href: null, // Hidden from tab bar — not exposed in production
        }}
      />
    </Tabs>
  );
}
