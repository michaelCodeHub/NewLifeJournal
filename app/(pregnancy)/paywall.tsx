import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscription } from '../../context/SubscriptionContext';

const PREMIUM_PERKS = [
  { icon: 'chatbubble-ellipses' as const, label: 'Unlimited AI Assistant messages' },
  { icon: 'stats-chart' as const, label: 'Health Charts — weight & blood pressure trends' },
  { icon: 'document-text' as const, label: 'PDF export of your full pregnancy report' },
  { icon: 'clipboard' as const, label: 'Birth Plan builder' },
  { icon: 'share-social' as const, label: 'Share Timeline with family' },
  { icon: 'people' as const, label: 'Post & comment in Community' },
];

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium, offerings, purchase, restore } = useSubscription();
  const [busyId, setBusyId] = useState<string | null>(null);

  const packages: any[] = offerings?.availablePackages ?? [];

  const handlePurchase = async (pkg: any) => {
    setBusyId(pkg.identifier);
    try {
      await purchase(pkg);
      Alert.alert('Welcome to Premium!', 'Thanks for upgrading — enjoy the full app.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Purchase failed', err.message || 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRestore = async () => {
    setBusyId('restore');
    try {
      await restore();
      Alert.alert('Restored', 'Your purchases have been restored.');
    } catch (err: any) {
      Alert.alert('Restore failed', err.message || 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
    >
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Ionicons name="close" size={24} color="#6B9FA1" />
      </TouchableOpacity>

      <View style={styles.headerIconCircle}>
        <Ionicons name="sparkles" size={32} color="#81bec1" />
      </View>
      <Text style={styles.title}>Bloom & Bump Premium</Text>
      <Text style={styles.subtitle}>
        {isPremium ? "You're already a premium member — thank you!" : 'Unlock the full pregnancy journey experience.'}
      </Text>

      <View style={styles.perksCard}>
        {PREMIUM_PERKS.map((perk) => (
          <View key={perk.label} style={styles.perkRow}>
            <View style={styles.perkIconCircle}>
              <Ionicons name={perk.icon} size={16} color="#81bec1" />
            </View>
            <Text style={styles.perkLabel}>{perk.label}</Text>
          </View>
        ))}
      </View>

      {isPremium ? (
        <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      ) : packages.length > 0 ? (
        packages.map((pkg) => (
          <TouchableOpacity
            key={pkg.identifier}
            style={styles.planButton}
            activeOpacity={0.85}
            disabled={busyId !== null}
            onPress={() => handlePurchase(pkg)}
          >
            {busyId === pkg.identifier ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.planButtonTitle}>{pkg.product?.title ?? pkg.identifier}</Text>
                <Text style={styles.planButtonPrice}>{pkg.product?.priceString ?? ''}</Text>
              </>
            )}
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.noOfferingsBox}>
          <Text style={styles.noOfferingsText}>
            Plans aren't available yet — RevenueCat/store products haven't been configured for this build.
            See MONETIZATION_PLAN.md for setup steps.
          </Text>
        </View>
      )}

      {!isPremium && (
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore} disabled={busyId !== null}>
          {busyId === 'restore' ? (
            <ActivityIndicator color="#81bec1" size="small" />
          ) : (
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F4F5' },
  content: { paddingHorizontal: 24, alignItems: 'center' },
  closeButton: { alignSelf: 'flex-end', padding: 4, marginBottom: 8 },
  headerIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(129, 190, 193, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    color: '#6B9FA1',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },
  perksCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(129, 190, 193, 0.25)',
    padding: 18,
    marginBottom: 28,
  },
  perkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  perkIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(129, 190, 193, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  perkLabel: { fontSize: 14, color: '#333', flex: 1 },
  planButton: {
    width: '100%',
    backgroundColor: '#81bec1',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#81bec1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  planButtonTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  planButtonPrice: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2 },
  noOfferingsBox: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  noOfferingsText: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 19 },
  restoreButton: { marginTop: 4, padding: 10 },
  restoreButtonText: { color: '#81bec1', fontWeight: '600', fontSize: 14 },
  doneButton: {
    width: '100%',
    backgroundColor: '#81bec1',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
