import { Tabs } from 'expo-router';
import CustomTabBar from '../../components/CustomTabBar';

export default function PregnancyLayout() {
  return (
    <Tabs
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="timeline" options={{ title: 'Timeline' }} />
      <Tabs.Screen name="chat" options={{ title: 'AI Assistant' }} />
      <Tabs.Screen name="kickcounter" options={{ title: 'Kick Counter' }} />
      <Tabs.Screen name="symptoms" options={{ title: 'Symptoms' }} />
      <Tabs.Screen name="visits" options={{ title: 'Hospital Visits' }} />
      <Tabs.Screen name="charts" options={{ title: 'Health Charts' }} />
      <Tabs.Screen name="contractiontimer" options={{ title: 'Contraction Timer' }} />
      <Tabs.Screen name="checklist" options={{ title: 'Baby Checklist' }} />
      <Tabs.Screen name="birthplan" options={{ title: 'Birth Plan' }} />
      <Tabs.Screen name="export" options={{ title: 'Export Report' }} />
      <Tabs.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Tabs.Screen name="sharetimeline" options={{ title: 'Share Timeline' }} />
      <Tabs.Screen name="community" options={{ title: 'Community' }} />
      <Tabs.Screen name="admin" options={{ title: 'Admin Setup', href: null }} />
    </Tabs>
  );
}
