import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { usePregnancy } from '../context/PregnancyContext';
import { useTheme } from '../context/ThemeContext';
import { ICONS } from '../constants/icons';

// All tabs with metadata
const ALL_TABS = [
  { name: 'home',             label: 'Home' },
  { name: 'timeline',        label: 'Timeline' },
  { name: 'chat',            label: 'Chat' },
  { name: 'kickcounter',     label: 'Kicks' },
  { name: 'symptoms',        label: 'Symptoms' },
  { name: 'visits',          label: 'Visits' },
  { name: 'charts',          label: 'Charts' },
  { name: 'contractiontimer',label: 'Contractions' },
  { name: 'checklist',       label: 'Checklist' },
  { name: 'birthplan',       label: 'Birth Plan' },
  { name: 'export',          label: 'Export' },
  { name: 'notifications',   label: 'Alerts' },
  { name: 'sharetimeline',   label: 'Share' },
  { name: 'community',       label: 'Community' },
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

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const [moreVisible, setMoreVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { getCurrentWeek, getDaysUntilDue } = usePregnancy();
  const { colors, isDark } = useTheme();
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

  const inactiveColor = colors.textMuted;

  const renderTab = (tab: typeof ALL_TABS[0]) => {
    const isActive = activeRouteName === tab.name;
    const color = isActive ? colors.primary : inactiveColor;
    return (
      <TouchableOpacity
        key={tab.name}
        style={styles.tab}
        onPress={() => navigateTo(tab.name)}
        activeOpacity={0.7}
      >
        <Ionicons name={ICONS[tab.name]} size={23} color={color} />
        <Text style={[styles.tabLabel, { color }, isActive && styles.tabLabelActive]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const isMoreActive = moreTabs.some(t => t.name === activeRouteName);

  return (
    <>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.tabBar,
            borderColor: colors.tabBarBorder,
            borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
          },
        ]}
      >
        {visibleTabs.map(renderTab)}

        {/* More button */}
        <TouchableOpacity style={styles.tab} onPress={openMore} activeOpacity={0.7}>
          <Ionicons
            name={ICONS.more}
            size={23}
            color={isMoreActive ? colors.primary : inactiveColor}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: isMoreActive ? colors.primary : inactiveColor },
              isMoreActive && styles.tabLabelActive,
            ]}
          >
            More
          </Text>
        </TouchableOpacity>
      </View>

      {/* More Modal */}
      <Modal transparent visible={moreVisible} animationType="none" onRequestClose={closeMore}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeMore} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>More</Text>

          <FlatList
            data={moreTabs}
            numColumns={3}
            keyExtractor={t => t.name}
            contentContainerStyle={styles.moreGrid}
            renderItem={({ item }) => {
              const isActive = activeRouteName === item.name;
              return (
                <TouchableOpacity
                  style={[
                    styles.moreItem,
                    { backgroundColor: colors.surfaceSecondary },
                    isActive && { backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => navigateTo(item.name)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={ICONS[item.name]}
                    size={24}
                    color={isActive ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.moreLabel,
                      { color: isActive ? colors.primary : colors.textSecondary },
                      isActive && styles.tabLabelActive,
                    ]}
                  >
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
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    borderRadius: 28,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    fontWeight: '700',
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
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
    gap: 8,
    paddingVertical: 18,
    margin: 6,
    borderRadius: 16,
  },
  moreLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
});
