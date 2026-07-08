import { Timestamp } from 'firebase/firestore';

export type SubscriptionTier = 'free' | 'premium';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'expired'
  | 'cancelled'
  | 'none';

// Mirrors RevenueCat's CustomerInfo into Firestore so the rest of the app
// (and Firestore rules, if used) can read tier without calling RevenueCat.
export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  productId?: string | null;
  expiresAt?: Timestamp | null;
  willRenew?: boolean;
  updatedAt: Timestamp;
}

// Free-tier AI Assistant usage, reset every calendar month.
export interface AiUsage {
  messagesUsedThisPeriod: number;
  periodStart: Timestamp;
}

export const FREE_AI_MESSAGE_LIMIT = 15;

// Must match the entitlement identifier configured in the RevenueCat dashboard.
export const PREMIUM_ENTITLEMENT_ID = 'premium';

// Screens/features fully gated behind premium (see MONETIZATION_PLAN.md).
export const PREMIUM_FEATURES = [
  'charts',
  'export',
  'birthplan',
  'sharetimeline',
  'community',
] as const;

export type PremiumFeature = (typeof PREMIUM_FEATURES)[number];
