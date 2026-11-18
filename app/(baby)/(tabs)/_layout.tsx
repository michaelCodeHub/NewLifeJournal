import { Tabs } from 'expo-router';
import TabBar from '../../../components/TabBar';
import { tabTransition } from '../../../constants/navigation';
import { useTheme } from '../../../context/ThemeContext';

/** Same five tabs as pregnancy mode, so switching modes feels like the same app. */
export default function BabyTabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        ...tabTransition(),
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
