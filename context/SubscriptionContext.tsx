import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
  syncSubscriptionToFirestore,
  getAiUsage,
  canSendFreeAiMessage,
} from '../services/subscriptionService';
import { SubscriptionTier, AiUsage, FREE_AI_MESSAGE_LIMIT } from '../types/subscription';

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

    // Dev-only manual override for testing gating UX before real store
    // products exist. Only ever set by the admin-claim-gated `devSetTier`
    // Cloud Function now — see functions/src/devTools.ts and MONETIZATION_PLAN.md.
    if (userProfile?.devTierOverride === 'premium' || userProfile?.devTierOverride === 'free') {
      setTier(userProfile.devTierOverride);
    } else {
      // Optimistic local read from the RevenueCat SDK for a snappy UI...
      const customerInfo = await fetchCustomerInfo();
      const resolved = tierFromCustomerInfo(customerInfo);
      setTier(resolved.tier);
      // ...then ask the server to independently verify with RevenueCat and
      // persist the authoritative copy. The client can no longer write
      // `subscription` to Firestore directly (see firestore.rules), so this
      // Cloud Function call is the only way it's updated.
      syncSubscriptionToFirestore().catch(() => {});
    }

    const usage = await getAiUsage(user.uid);
    setAiUsage(usage);

    const currentOfferings = await fetchOfferings();
    setOfferings(currentOfferings);

    setLoading(false);
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

  const value: SubscriptionContextType = {
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
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
