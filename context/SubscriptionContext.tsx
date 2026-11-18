import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { AppState } from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import {
  initPurchases,
  logOutPurchases,
  fetchCustomerInfo,
  fetchOfferings,
  purchasePackage as purchasePackageService,
  restorePurchases as restorePurchasesService,
  tierFromCustomerInfo,
  tierFromProfile,
  syncSubscriptionToFirestore,
  getAiUsage,
  canSendFreeAiMessage,
} from '../services/subscriptionService';
import { SubscriptionTier, AiUsage, FREE_AI_MESSAGE_LIMIT } from '../types/subscription';
import { logError } from '../services/monitoring/errorLogger';

interface ServerAiUsage {
  messagesUsedThisPeriod: number;
  limit: number;
  tier: 'free' | 'premium';
}

interface SubscriptionContextType {
  tier: SubscriptionTier;
  isPremium: boolean;
  loading: boolean;
  // AI Assistant usage (free tier only — always true/unlimited for premium)
  aiMessageLimit: number;
  aiMessagesUsed: number;
  aiMessagesRemaining: number;
  canSendAiMessage: boolean;
  // Called with the usage figure the aiChat Cloud Function returns after a
  // successful send — this is the authoritative count, computed server-side,
  // so there's nothing for the client to write back to Firestore.
  applyServerAiUsage: (usage: ServerAiUsage) => void;
  // Purchases
  offerings: any | null;
  purchase: (pkg: any) => Promise<void>;
  restore: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [loading, setLoading] = useState(true);
  const [aiUsage, setAiUsage] = useState<AiUsage | null>(null);
  const [offerings, setOfferings] = useState<any | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setTier('free');
      setAiUsage(null);
      setLoading(false);
      return;
    }

    // Never leave the plan "loading" because a read failed (e.g. offline): every
    // step below is best-effort, and loading always ends.
    try {
      // Manual plan override for test/comped accounts, set from a trusted
      // machine with `functions/scripts/setPlan.js` (clients can't write it).
      if (userProfile?.devTierOverride === 'premium' || userProfile?.devTierOverride === 'free') {
        setTier(userProfile.devTierOverride);
      } else {
        // Optimistic local read from the RevenueCat SDK for a snappy UI...
        const customerInfo = await fetchCustomerInfo();
        const resolved = tierFromCustomerInfo(customerInfo);
        // No SDK (web / Expo Go): fall back to the server-verified mirror, honouring its expiry.
        setTier(customerInfo ? resolved.tier : tierFromProfile(userProfile?.subscription));
        // ...then ask the server to independently verify with RevenueCat and
        // persist the authoritative copy. The client can no longer write
        // `subscription` to Firestore directly (see firestore.rules), so this
        // Cloud Function call is the only way it's updated.
        syncSubscriptionToFirestore().catch(() => {});
      }

      // AI usage is only a display value (the server enforces the limit), so a failed
      // read (offline) keeps what we had instead of throwing.
      try {
        setAiUsage(await getAiUsage(user.uid));
      } catch {
        // eslint-disable-next-line no-console
        console.warn('[subscription] AI usage not loaded (offline?) — keeping the last value');
      }

      setOfferings(await fetchOfferings());
    } catch (err) {
      logError(err, { screen: 'subscription', action: 'refresh' });
    } finally {
      setLoading(false);
    }
  }, [user, userProfile?.devTierOverride]);

  // Configure RevenueCat + load initial state whenever the signed-in user changes.
  useEffect(() => {
    if (!user) {
      logOutPurchases();
      setTier('free');
      setAiUsage(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    initPurchases(user.uid).then(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // The profile arrives a moment after the user (separate Firestore read), so
  // re-resolve the tier once it does — otherwise a dev override or the cached
  // server tier is ignored until the next app foreground.
  const profileLoaded = !!userProfile;
  const overrideTier = userProfile?.devTierOverride;
  useEffect(() => {
    if (user && profileLoaded) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoaded, overrideTier]);

  // Re-check entitlement when the app comes back to the foreground, so a
  // renewal/cancellation made outside the app (e.g. in Settings) is picked up.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && user) refresh();
    });
    return () => sub.remove();
  }, [user, refresh]);

  // Called by ChatbotContext with the usage figure returned by the aiChat
  // Cloud Function response — that count was computed and persisted
  // server-side already, so this is purely a local state update for the UI.
  const applyServerAiUsage = useCallback((usage: ServerAiUsage) => {
    setAiUsage((prev) => ({
      messagesUsedThisPeriod: usage.messagesUsedThisPeriod,
      periodStart: prev?.periodStart ?? Timestamp.now(),
    }));
    if (usage.tier === 'premium' || usage.tier === 'free') {
      setTier(usage.tier);
    }
  }, []);

  const purchase = useCallback(
    async (pkg: any) => {
      const customerInfo = await purchasePackageService(pkg);
      const resolved = tierFromCustomerInfo(customerInfo);
      setTier(resolved.tier); // optimistic
      if (user) {
        await syncSubscriptionToFirestore(); // authoritative, verified server-side
        await refreshUserProfile();
      }
    },
    [user, refreshUserProfile]
  );

  const restore = useCallback(async () => {
    const customerInfo = await restorePurchasesService();
    const resolved = tierFromCustomerInfo(customerInfo);
    setTier(resolved.tier); // optimistic
    if (user) {
      await syncSubscriptionToFirestore(); // authoritative, verified server-side
      await refreshUserProfile();
    }
  }, [user, refreshUserProfile]);

  const isPremium = tier === 'premium';
  const messagesUsed = aiUsage?.messagesUsedThisPeriod ?? 0;
  const aiMessagesRemaining = isPremium
    ? Infinity
    : Math.max(0, FREE_AI_MESSAGE_LIMIT - messagesUsed);
  const canSendAiMessage = isPremium || (aiUsage ? canSendFreeAiMessage(aiUsage) : true);

  const value = useMemo<SubscriptionContextType>(
    () => ({
      tier,
      isPremium,
      loading,
      aiMessageLimit: FREE_AI_MESSAGE_LIMIT,
      aiMessagesUsed: messagesUsed,
      aiMessagesRemaining,
      canSendAiMessage,
      applyServerAiUsage,
      offerings,
      purchase,
      restore,
      refresh,
    }),
    [tier, isPremium, loading, messagesUsed, aiMessagesRemaining, canSendAiMessage, applyServerAiUsage, offerings, purchase, restore, refresh]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
