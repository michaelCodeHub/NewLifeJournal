import { Ionicons } from '@expo/vector-icons';

type IonName = keyof typeof Ionicons.glyphMap;

/**
 * Central icon map for the app. Minimalist line icons (Ionicons "outline").
 * Keyed by the route/feature name so the tab bar and screens stay consistent.
 */
export const ICONS: Record<string, IonName> = {
  home: 'home-outline',
  timeline: 'calendar-outline',
  chat: 'chatbubble-outline',
  kickcounter: 'footsteps-outline',
  symptoms: 'thermometer-outline',
  visits: 'medkit-outline',
  charts: 'stats-chart-outline',
  contractiontimer: 'timer-outline',
  checklist: 'checkbox-outline',
  birthplan: 'document-text-outline',
  export: 'download-outline',
  notifications: 'notifications-outline',
  sharetimeline: 'share-social-outline',
  community: 'people-outline',
  admin: 'settings-outline',
  more: 'ellipsis-horizontal',
};

// Small semantic icons used inside screens.
export const UI_ICONS = {
  bell: 'notifications-outline' as IonName,
  height: 'resize-outline' as IonName,
  weight: 'barbell-outline' as IonName,
  sparkle: 'sparkles-outline' as IonName,
  chevron: 'chevron-forward' as IonName,
  fruit: 'nutrition-outline' as IonName,
  baby: 'happy-outline' as IonName,
};
