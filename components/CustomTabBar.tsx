import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  FlatList,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { usePregnancy } from '../context/PregnancyContext';

const { width } = Dimensions.get('window');

// All tabs with metadata
const ALL_TABS = [
  { name: 'home',             label: 'Home',        icon: '🏠' },
  { name: 'timeline',        label: 'Timeline',    icon: '📅' },
  { name: 'chat',            label: 'Chat',        icon: '💬' },
  { name: 'kickcounter',     label: 'Kicks',       icon: '👶' },
  { name: 'symptoms',        label: 'Symptoms',    icon: '💊' },
  { name: 'visits',          label: 'Visits',      icon: '🏥' },
  { name: 'charts',          label: 'Charts',      icon: '📊' },
  { name: 'contractiontimer',label: 'Contractions',icon: '⏱️' },
  { name: 'checklist',       label: 'Checklist',   icon: '✅' },
  { name: 'birthplan',       label: 'Birth Plan',  icon: '📝' },
  { name: 'export',          label: 'Export',      icon: '📄' },
  { name: 'notifications',   label: 'Alerts',      icon: '🔔' },
  { name: 'sharetimeline',   label: 'Share',       icon: '🔗' },
  { name: 'community',       label: 'Community',   icon: '👥' },
];

// Priority order by trimester/week
// Returns ordered list of tab names (most important first)
function getPriorityTabs(week: number, daysUntilDue: number): string[] {
  // Near due date (last 3 weeks, days <= 21)
  if (daysUntilDue <= 21) {
    return [
      'home',
      'contractiontimer',
      'checklist',
      'birthplan',
      'timeline',
      'kicks',
      'chat',
      'symptoms',
      'visits',
      'charts',
      'notifications',
      'export',
      'sharetimeline',
      'community',
    ];
  }

  // Third trimester (weeks 27–40)
  if (week >= 27) {
    return [
      'home',
      'timeline',
      'kickcounter',
      'checklist',
      'contractiontimer',
      'birthplan',
      'chat',
      'symptoms',
      'visits',
      'charts',
      'notifications',
      'export',
      'sharetimeline',
      'community',
    ];
  }

  // Second trimester (weeks 13–26)
  if (week >= 13) {
    return [
      'home',
      'timeline',
      'kickcounter',
      'charts',
      'visits',
      'symptoms',
      'chat',
      'checklist',
      'notifications',
      'birthplan',
      'contractiontimer',
      'export',
      'sharetimeline',
      'community',
    ];
  }

  // First trimester (weeks 1–12) — default / early pregnancy
  return [
    'home',
    'timeline',
    'symptoms',
    'chat',
    'visits',
    'charts',
    'kickcounter',
    'notifications',
    'checklist',
    'birthplan',
    'contractiontimer',
    'export',
    'sharetimeline',
    'community',
  ];
}

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const [moreVisible, setMoreVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { getCurrentWeek, getDaysUntilDue } = usePregnancy();
  const week = getCurrentWeek();
  const daysUntilDue = getDaysUntilDue();

  const priorityOrder = getPriorityTabs(week, daysUntilDue);

  // Build a map of route name → route index (only for routes that exist in navigator)
  const routeMap = new Map(state.routes.map((r, i) => [r.name, i]));

  // Sort ALL_TABS by priority, keep only ones that exist as routes
  const sortedTabs = [...ALL_TABS]
    .filter(t => routeMap.has(t.name))
    .sort((a, b) => {
      const ai = priorityOrder.indexOf(a.name);
      const bi = priorityOrder.indexOf(b.name);
      const aIdx = ai === -1 ? 999 : ai;
      const bIdx = bi === -1 ? 999 : bi;
      return aIdx - bIdx;
    });

  // First 4 = visible in bar, rest go into More
  const visibleTabs = sortedTabs.slice(0, 4);
  const moreTabs = sortedTabs.slice(4);

  const activeRouteName = state.routes[state.index].name;

  const openMore = () => {
    setMoreVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const closeMore = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 400, duration: 220, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setMoreVisible(false));
  };

  const navigateTo = (routeName: string) => {
    closeMore();
    const idx = routeMap.get(routeName);
    if (idx === undefined) return;
    const event = navigation.emit({ type: 'tabPress', target: state.routes[idx].key, canPreventDefault: true });
    if (!event.defaultPrevented) {
      navigation.navigate(state.routes[idx].name);
    }
  };

  const renderTab = (tab: typeof ALL_TABS[0]) => {
    const isActive = activeRouteName === tab.name;
    return (
      <TouchableOpacity
        key={tab.name}
        style={styles.tab}
        onPress={() => navigateTo(tab.name)}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>{tab.icon}</Text>
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
        {isActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    );
  };

  const isMoreActive = moreTabs.some(t => t.name === activeRouteName);

  return (
    <>
      <View style={styles.bar}>
        {visibleTabs.map(renderTab)}

        {/* More button */}
        <TouchableOpacity style={styles.tab} onPress={openMore} activeOpacity={0.7}>
          <Text style={[styles.tabIcon, isMoreActive && styles.tabIconActive]}>
            {isMoreActive ? '●●●' : '···'}
          </Text>
          <Text style={[styles.tabLabel, isMoreActive && styles.tabLabelActive]}>More</Text>
          {isMoreActive && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>

      {/* More Modal */}
      <Modal transparent visible={moreVisible} animationType="none" onRequestClose={closeMore}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeMore} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>More</Text>

          <FlatList
            data={moreTabs}
            numColumns={3}
            keyExtractor={t => t.name}
            contentContainerStyle={styles.moreGrid}
            renderItem={({ item }) => {
              const isActive = activeRouteName === item.name;
              return (
                <TouchableOpacity
                  style={[styles.moreItem, isActive && styles.moreItemActive]}
                  onPress={() => navigateTo(item.name)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moreIcon}>{item.icon}</Text>
                  <Text style={[styles.moreLabel, isActive && styles.moreLabelActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          <SafeAreaView />
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
    paddingTop: 8,
    paddingBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 6,
    position: 'relative',
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#81bec1',
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#81bec1',
  },

  // Backdrop
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  // Bottom sheet
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  moreGrid: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  moreItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    margin: 6,
    borderRadius: 14,
    backgroundColor: '#f5f5f5',
  },
  moreItemActive: {
    backgroundColor: '#E0F2F3',
    borderWidth: 1.5,
    borderColor: '#81bec1',
  },
  moreIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  moreLabel: {
    fontSize: 11,
    color: '#555',
    fontWeight: '500',
    textAlign: 'center',
  },
  moreLabelActive: {
    color: '#81bec1',
    fontWeight: '700',
  },
});
