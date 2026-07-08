import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppState } from 'react-native';
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
  incrementAiUsage,
} from '../services/subscriptionService';
import { SubscriptionTier, AiUsage, FREE_AI_MESSAGE_LIMIT } from '../types/subscription';

interface SubscriptionContextType {
  tier: SubscriptionTier;
  isPremium: boolean;
  loading: boolean;
  // AI Assistant usage (free tier only — always true/unlimited for premium)
  aiMessageLimit: number;
  aiMessagesUsed: number;
  aiMessagesRemaining: number;
  canSendAiMessage: boolean;
  recordAiMessage: () => Promise<void>;
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
    // products exist. Remove `devTierOverride` handling before shipping —
    // see MONETIZATION_PLAN.md.
    if (userProfile?.devTierOverride === 'premium' || userProfile?.devTierOverride === 'free') {
      setTier(userProfile.devTierOverride);
    } else {
      const customerInfo = await fetchCustomerInfo();
      const resolved = tierFromCustomerInfo(customerInfo);
      setTier(resolved.tier);
      // Best-effort mirror to Firestore; don't block UI on it.
      syncSubscriptionToFirestore(user.uid, resolved).catch(() => {});
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

  const recordAiMessage = useCallback(async () => {
    if (!user || tier === 'premium' || !aiUsage) return;
    const updated = await incrementAiUsage(user.uid, aiUsage);
    setAiUsage(updated);
  }, [user, tier, aiUsage]);

  const purchase = useCallback(
    async (pkg: any) => {
      const customerInfo = await purchasePackageService(pkg);
      const resolved = tierFromCustomerInfo(customerInfo);
      setTier(resolved.tier);
      if (user) {
        await syncSubscriptionToFirestore(user.uid, resolved);
        await refreshUserProfile();
      }
    },
    [user, refreshUserProfile]
  );

  const restore = useCallback(async () => {
    const customerInfo = await restorePurchasesService();
    const resolved = tierFromCustomerInfo(customerInfo);
    setTier(resolved.tier);
    if (user) {
      await syncSubscriptionToFirestore(user.uid, resolved);
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
    recordAiMessage,
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
