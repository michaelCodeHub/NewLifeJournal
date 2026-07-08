import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSubscription } from '../context/SubscriptionContext';

interface PremiumGateProps {
  /** Screen title shown on the upsell card, e.g. "Health Charts". */
  title: string;
  /** One or two sentences on what upgrading unlocks for this feature. */
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}

/**
 * Wraps a screen's content. Renders `children` unchanged for premium users;
 * renders an upgrade prompt instead of the feature for free users.
 *
 * Usage: put this as the outermost return once all of a screen's hooks have
 * already run, e.g.:
 *
 *   if (!isPremium) {
 *     return <PremiumGate title="Health Charts" description="...">{null}</PremiumGate>;
 *   }
 */
export default function PremiumGate({ title, description, icon = 'lock-closed', children }: PremiumGateProps) {
  const { isPremium } = useSubscription();
  const router = useRouter();

  if (isPremium) return <>{children}</>;

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={32} color="#81bec1" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{description}</Text>
      <TouchableOpacity
        style={styles.upgradeButton}
        activeOpacity={0.85}
        onPress={() => router.push('/(pregnancy)/paywall')}
      >
        <Ionicons name="sparkles" size={16} color="#fff" style={{ marginRight: 6 }} />
        <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F4F5',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(129, 190, 193, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B9FA1',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#81bec1',
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 24,
    shadowColor: '#81bec1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  upgradeButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
