import { Tabs } from 'expo-router';
import TabBar from '../../../components/TabBar';
import { useTheme } from '../../../context/ThemeContext';

/** Five labelled tabs in a fixed order: Home · Timeline · Tools · Ask · You. */
export default function PregnancyTabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="timeline" options={{ title: 'Timeline' }} />
      <Tabs.Screen name="tools" options={{ title: 'Tools' }} />
      <Tabs.Screen name="chat" options={{ title: 'Ask' }} />
      <Tabs.Screen name="profile" options={{ title: 'You' }} />
    </Tabs>
  );
}
