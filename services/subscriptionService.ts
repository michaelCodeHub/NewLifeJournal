import { Platform } from 'react-native';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  SubscriptionInfo,
  SubscriptionStatus,
  SubscriptionTier,
  AiUsage,
  FREE_AI_MESSAGE_LIMIT,
  PREMIUM_ENTITLEMENT_ID,
} from '../types/subscription';

// ---------------------------------------------------------------------------
// react-native-purchases (RevenueCat) is a native module. It is not present
// until `npx expo prebuild` / an EAS build installs and links it — running in
// Expo Go or an older dev client would otherwise crash on import. Lazy-require
// it (same pattern as expo-image-picker in chat.tsx) so the rest of the app,
// and everyone on the free tier, keeps working before that build step happens.
// ---------------------------------------------------------------------------
type PurchasesModule = typeof import('react-native-purchases');

const getPurchases = (): PurchasesModule['default'] | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-purchases').default;
  } catch {
    return null;
  }
};

let didConfigure = false;

/**
 * Initialize RevenueCat and log the current user in under their Firebase uid.
 * Safe to call multiple times; safe to call before the native module exists
 * (no-ops with a console warning instead of throwing).
 */
export const initPurchases = async (uid: string): Promise<void> => {
  const Purchases = getPurchases();
  if (!Purchases) {
    console.warn(
      '[subscriptionService] react-native-purchases not installed/built yet — ' +
        'all users will read as free tier until `npx expo prebuild` is run. See MONETIZATION_PLAN.md.'
    );
    return;
  }

  const apiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

  if (!apiKey) {
    console.warn(
      '[subscriptionService] Missing EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY — ' +
        'add them to your .env once the RevenueCat project exists.'
    );
    return;
  }

  try {
    if (!didConfigure) {
      Purchases.configure({ apiKey, appUserID: uid });
      didConfigure = true;
    } else {
      await Purchases.logIn(uid);
    }
  } catch (err) {
    console.error('[subscriptionService] Failed to configure/login to RevenueCat:', err);
  }
};

export const logOutPurchases = async (): Promise<void> => {
  const Purchases = getPurchases();
  if (!Purchases || !didConfigure) return;
  try {
    await Purchases.logOut();
  } catch (err) {
    console.error('[subscriptionService] Failed to log out of RevenueCat:', err);
  }
};

/** Returns the raw CustomerInfo, or null if RevenueCat isn't available. */
export const fetchCustomerInfo = async (): Promise<any | null> => {
  const Purchases = getPurchases();
  if (!Purchases || !didConfigure) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (err) {
    console.error('[subscriptionService] Failed to fetch customer info:', err);
    return null;
  }
};

/** Fetches purchasable offerings/packages configured in the RevenueCat dashboard. */
export const fetchOfferings = async (): Promise<any | null> => {
  const Purchases = getPurchases();
  if (!Purchases || !didConfigure) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (err) {
    console.error('[subscriptionService] Failed to fetch offerings:', err);
    return null;
  }
};

export const purchasePackage = async (pkg: any): Promise<any | null> => {
  const Purchases = getPurchases();
  if (!Purchases) {
    throw new Error('In-app purchases are not available in this build yet.');
  }
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
};

export const restorePurchases = async (): Promise<any | null> => {
  const Purchases = getPurchases();
  if (!Purchases) {
    throw new Error('In-app purchases are not available in this build yet.');
  }
  return Purchases.restorePurchases();
};

/** Derives our simplified tier/status from a RevenueCat CustomerInfo object. */
export const tierFromCustomerInfo = (
  customerInfo: any | null
): { tier: SubscriptionTier; status: SubscriptionStatus; productId: string | null; expiresAt: Date | null; willRenew: boolean } => {
  const entitlement = customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];

  if (!entitlement) {
    return { tier: 'free', status: 'none', productId: null, expiresAt: null, willRenew: false };
  }

  const expiresAt = entitlement.expirationDate ? new Date(entitlement.expirationDate) : null;
  const isTrial = entitlement.periodType === 'trial';

  return {
    tier: 'premium',
    status: isTrial ? 'trialing' : 'active',
    productId: entitlement.productIdentifier ?? null,
    expiresAt,
    willRenew: !!entitlement.willRenew,
  };
};

// ---------------------------------------------------------------------------
// Firestore mirror — lets the rest of the app read tier without calling
// RevenueCat directly, and gives us a place to hang a dev-only manual override.
// ---------------------------------------------------------------------------

export const syncSubscriptionToFirestore = async (
  uid: string,
  info: { tier: SubscriptionTier; status: SubscriptionStatus; productId: string | null; expiresAt: Date | null; willRenew: boolean }
): Promise<void> => {
  const subscription: SubscriptionInfo = {
    tier: info.tier,
    status: info.status,
    productId: info.productId,
    expiresAt: info.expiresAt ? Timestamp.fromDate(info.expiresAt) : null,
    willRenew: info.willRenew,
    updatedAt: Timestamp.now(),
  };

  await setDoc(doc(db, 'users', uid), { subscription }, { merge: true });
};

// ---------------------------------------------------------------------------
// Free-tier AI Assistant usage counter (resets every calendar month)
// ---------------------------------------------------------------------------

const isSamePeriod = (periodStart: Date, now: Date): boolean =>
  periodStart.getFullYear() === now.getFullYear() && periodStart.getMonth() === now.getMonth();

const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);

/** Reads current-month AI usage, resetting the counter if the month rolled over. */
export const getAiUsage = async (uid: string): Promise<AiUsage> => {
  const now = new Date();
  const snap = await getDoc(doc(db, 'users', uid));
  const existing = snap.exists() ? (snap.data().aiUsage as AiUsage | undefined) : undefined;

  if (existing?.periodStart && isSamePeriod(existing.periodStart.toDate(), now)) {
    return existing;
  }

  return { messagesUsedThisPeriod: 0, periodStart: Timestamp.fromDate(startOfMonth(now)) };
};

export const canSendFreeAiMessage = (usage: AiUsage): boolean =>
  usage.messagesUsedThisPeriod < FREE_AI_MESSAGE_LIMIT;

/** Call after a successful AI response for free-tier users only. */
export const incrementAiUsage = async (uid: string, currentUsage: AiUsage): Promise<AiUsage> => {
  const updated: AiUsage = {
    messagesUsedThisPeriod: currentUsage.messagesUsedThisPeriod + 1,
    periodStart: currentUsage.periodStart,
  };
  await setDoc(doc(db, 'users', uid), { aiUsage: updated }, { merge: true });
  return updated;
};
