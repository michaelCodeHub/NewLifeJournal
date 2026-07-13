import { Ionicons } from '@expo/vector-icons';

type IonName = keyof typeof Ionicons.glyphMap;

/**
 * Single source of truth for "what matters when" across the pregnancy journey.
 * Used by the bottom tab bar (reorders itself) and the Home screen
 * ("Recommended for you" section).
 */
export interface FeatureTab {
  name: string;
  label: string; // short label for the tab bar
  title: string; // fuller title for cards
  description: string; // why it's relevant right now
  icon: IonName;
  route: string; // expo-router path
}

export const ALL_TABS: FeatureTab[] = [
  { name: 'home', label: 'Home', title: 'Home', description: '', icon: 'home-outline', route: '/(pregnancy)/home' },
  { name: 'timeline', label: 'Timeline', title: 'Timeline', description: 'Review your journey so far', icon: 'calendar-outline', route: '/(pregnancy)/timeline' },
  { name: 'chat', label: 'Chat', title: 'AI Assistant', description: 'Ask a pregnancy question', icon: 'chatbubble-outline', route: '/(pregnancy)/chat' },
  { name: 'kickcounter', label: 'Kicks', title: 'Kick Counter', description: "Track baby's movements", icon: 'footsteps-outline', route: '/(pregnancy)/kickcounter' },
  { name: 'symptoms', label: 'Symptoms', title: 'Symptoms', description: "Log how you're feeling", icon: 'thermometer-outline', route: '/(pregnancy)/symptoms' },
  { name: 'visits', label: 'Visits', title: 'Hospital Visits', description: 'Log your next appointment', icon: 'medkit-outline', route: '/(pregnancy)/visits' },
  { name: 'charts', label: 'Charts', title: 'Health Charts', description: 'See your weight & BP trends', icon: 'stats-chart-outline', route: '/(pregnancy)/charts' },
  { name: 'contractiontimer', label: 'Contractions', title: 'Contraction Timer', description: 'Time contractions as labor nears', icon: 'timer-outline', route: '/(pregnancy)/contractiontimer' },
  { name: 'checklist', label: 'Checklist', title: 'Baby Checklist', description: 'Prep your hospital bag & nursery', icon: 'checkbox-outline', route: '/(pregnancy)/checklist' },
  { name: 'birthplan', label: 'Birth Plan', title: 'Birth Plan', description: 'Set your preferences for labor', icon: 'document-text-outline', route: '/(pregnancy)/birthplan' },
  { name: 'export', label: 'Export', title: 'Export Report', description: 'Share your history with your provider', icon: 'download-outline', route: '/(pregnancy)/export' },
  { name: 'notifications', label: 'Alerts', title: 'Notifications', description: 'Set appointment reminders', icon: 'notifications-outline', route: '/(pregnancy)/notifications' },
  { name: 'sharetimeline', label: 'Share', title: 'Share Timeline', description: 'Invite your partner to follow along', icon: 'share-social-outline', route: '/(pregnancy)/sharetimeline' },
  { name: 'community', label: 'Community', title: 'Community', description: 'Connect with others at your stage', icon: 'people-outline', route: '/(pregnancy)/community' },
];

export const FEATURE_BY_NAME: Record<string, FeatureTab> = Object.fromEntries(
  ALL_TABS.map(t => [t.name, t])
);

/**
 * Priority order by trimester/week. Returns ordered list of tab names
 * (most relevant first). Used to reorder the tab bar and to pick
 * Home-screen recommendations.
 */
export function getPriorityTabs(week: number, daysUntilDue: number): string[] {
  // Near due date (last 3 weeks, days <= 21)
  if (daysUntilDue <= 21) {
    return [
      'home',
      'contractiontimer',
      'checklist',
      'birthplan',
      'timeline',
      'kickcounter',
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

/**
 * Top N features worth surfacing right now, excluding the always-present
 * core tabs (home/timeline/chat) since those don't need a recommendation.
 */
export function getRecommendedFeatures(
  week: number,
  daysUntilDue: number,
  count = 4
): FeatureTab[] {
  const alwaysCore = new Set(['home', 'timeline', 'chat']);
  return getPriorityTabs(week, daysUntilDue)
    .filter(name => !alwaysCore.has(name))
    .map(name => FEATURE_BY_NAME[name])
    .filter((t): t is FeatureTab => !!t)
    .slice(0, count);
}
