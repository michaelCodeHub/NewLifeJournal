import { Platform, NativeModules } from 'react-native';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
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
  // Guard against the native module being absent (no prebuild / older dev client).
  // react-native-purchases calls `new NativeEventEmitter(RNPurchases)` at module
  // level, which throws synchronously if RNPurchases is null — checking here
  // prevents that from becoming an unhandled rejection.
  if (!NativeModules.RNPurchases) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Purchases = require('react-native-purchases').default as PurchasesModule['default'];
    installLogHandler(Purchases);
    return Purchases;
  } catch {
    return null;
  }
};

/**
 * react-native-purchases only sets its JS log handler inside configure(), but the
 * native SDK keeps emitting log events — e.g. after a dev reload, or before
 * configure — and the library then calls an undefined handler ("undefined is not a
 * function", an uncaught exception). Install ours as soon as the module loads.
 */
let logHandlerInstalled = false;
const installLogHandler = (Purchases: PurchasesModule['default']) => {
  if (logHandlerInstalled) return;
  logHandlerInstalled = true;
  try {
    Purchases.setLogHandler((level, message) => {
      // eslint-disable-next-line no-console
      if (String(level) === 'ERROR') console.warn(`[RevenueCat] ${message}`);
    });
  } catch {
    // Older native builds without setLogHandler: nothing to forward.
  }
};

/**
 * A real RevenueCat public SDK key: `goog_…` (Android) / `appl_…` (iOS). Anything else
 * — empty, or the .env.example placeholder — means "not set up yet": skip RevenueCat
 * instead of configuring it with a fake key (which only produces native errors).
 */
export const isRevenueCatKey = (key: string | undefined, os: string = Platform.OS): key is string =>
  !!key && (os === 'ios' ? /^appl_[A-Za-z0-9]+$/ : /^goog_[A-Za-z0-9]+$/).test(key.trim());

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

  if (!isRevenueCatKey(apiKey)) {
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
// Subscription tier — the authoritative copy lives in Firestore, but it is
// now written ONLY by the `syncSubscription` / `revenueCatWebhook` Cloud
// Functions (via the Admin SDK). The client used to write this doc directly
// with whatever RevenueCat CustomerInfo it had locally, which meant any user
// could grant themselves "premium" by writing a fake object straight to
// Firestore — firestore.rules now rejects client writes to this field
// entirely, so `syncSubscriptionCallable` below is the only way it changes.
// ---------------------------------------------------------------------------

const syncSubscriptionCallable = httpsCallable<void, { tier: SubscriptionTier; status: SubscriptionStatus }>(
  functions,
  'syncSubscription'
);

/**
 * Asks the server to re-derive this user's tier from RevenueCat directly
 * (server-to-server) and persist it. Call after purchase/restore and when the
 * app returns to the foreground.
 */
export const syncSubscriptionToFirestore = async (): Promise<{ tier: SubscriptionTier; status: SubscriptionStatus }> => {
  const result = await syncSubscriptionCallable();
  return result.data;
};

// ---------------------------------------------------------------------------
// Free-tier AI Assistant usage counter (resets on the 1st of each month, UTC —
// the same rule functions/src/aiChat.ts enforces)
// ---------------------------------------------------------------------------

const isSamePeriod = (periodStart: Date, now: Date): boolean =>
  periodStart.getUTCFullYear() === now.getUTCFullYear() && periodStart.getUTCMonth() === now.getUTCMonth();

const startOfMonth = (d: Date): Date => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

/** The 1st of next month (UTC), when the free AI allowance resets. */
export const nextAiResetDate = (now = new Date()): Date => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

/**
 * Tier from the server-mirrored Firestore copy, used where the RevenueCat SDK
 * isn't available (web, Expo Go). An expired premium mirror counts as free.
 */
export const tierFromProfile = (subscription: any): SubscriptionTier => {
  if (subscription?.tier !== 'premium') return 'free';
  const expires = subscription.expiresAt?.toDate?.() as Date | undefined;
  return !expires || expires.getTime() > Date.now() ? 'premium' : 'free';
};

/**
 * Read-only fetch of current-month AI usage, for initial display before the
 * user has sent a message this session. The counter itself is only ever
 * incremented server-side, inside the `aiChat` Cloud Function — see
 * functions/src/aiChat.ts — so this is safe to read but must not be written
 * to from the client (firestore.rules blocks it regardless).
 */
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
