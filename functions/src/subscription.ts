import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { db, admin } from './admin';

// RevenueCat secret (server) API key — used to look up a user's real
// entitlements from RevenueCat's REST API. This must never be the public SDK
// key (that one is fine client-side); it's the "sk_..." key from
// RevenueCat > Project Settings > API keys > Secret key.
const REVENUECAT_SECRET_KEY = defineSecret('REVENUECAT_SECRET_KEY');

// Shared secret configured as the "Authorization header value" for the
// RevenueCat webhook (RevenueCat dashboard > Integrations > Webhooks).
const REVENUECAT_WEBHOOK_SECRET = defineSecret('REVENUECAT_WEBHOOK_SECRET');

const PREMIUM_ENTITLEMENT_ID = 'premium';

interface ResolvedTier {
  tier: 'free' | 'premium';
  status: 'active' | 'trialing' | 'expired' | 'cancelled' | 'none';
  productId: string | null;
  expiresAt: FirebaseFirestore.Timestamp | null;
  willRenew: boolean;
}

function resolveFromEntitlements(entitlements: any): ResolvedTier {
  const entitlement = entitlements?.[PREMIUM_ENTITLEMENT_ID];
  if (!entitlement) {
    return { tier: 'free', status: 'none', productId: null, expiresAt: null, willRenew: false };
  }
  const expiresAtDate = entitlement.expires_date ? new Date(entitlement.expires_date) : null;
  const isTrial = entitlement.period_type === 'trial';
  return {
    tier: 'premium',
    status: isTrial ? 'trialing' : 'active',
    productId: entitlement.product_identifier ?? null,
    expiresAt: expiresAtDate ? admin.firestore.Timestamp.fromDate(expiresAtDate) : null,
    willRenew: !!entitlement.unsubscribe_detected_at === false,
  };
}

async function writeSubscription(uid: string, resolved: ResolvedTier): Promise<void> {
  await db
    .collection('users')
    .doc(uid)
    .set(
      {
        subscription: {
          tier: resolved.tier,
          status: resolved.status,
          productId: resolved.productId,
          expiresAt: resolved.expiresAt,
          willRenew: resolved.willRenew,
          updatedAt: admin.firestore.Timestamp.now(),
        },
      },
      { merge: true }
    );
}

/**
 * Callable the client hits right after a purchase/restore (and on app
 * foreground) to refresh its *authoritative* tier. Unlike the old client code,
 * this doesn't trust anything the client says about its own entitlement — it
 * asks RevenueCat directly, server-to-server, using the secret API key.
 */
export const syncSubscription = onCall(
  { secrets: [REVENUECAT_SECRET_KEY] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }
    const uid = request.auth.uid;

    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`, {
      headers: {
        Authorization: `Bearer ${REVENUECAT_SECRET_KEY.value()}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new HttpsError('internal', `RevenueCat lookup failed: ${res.status} - ${text}`);
    }

    const json: any = await res.json();
    const resolved = resolveFromEntitlements(json?.subscriber?.entitlements);
    await writeSubscription(uid, resolved);

    return { tier: resolved.tier, status: resolved.status };
  }
);

/**
 * RevenueCat webhook — keeps Firestore's mirrored tier correct even when the
 * app isn't open (renewals, cancellations, billing issues, refunds). Configure
 * this URL + the same secret value in RevenueCat > Integrations > Webhooks.
 */
export const revenueCatWebhook = onRequest(
  { secrets: [REVENUECAT_WEBHOOK_SECRET, REVENUECAT_SECRET_KEY] },
  async (req, res) => {
    const authHeader = req.get('Authorization') || '';
    if (authHeader !== `Bearer ${REVENUECAT_WEBHOOK_SECRET.value()}`) {
      res.status(401).send('Unauthorized');
      return;
    }

    const event = req.body?.event;
    const appUserId: string | undefined = event?.app_user_id;
    if (!appUserId) {
      res.status(400).send('Missing app_user_id');
      return;
    }

    // Simplest correct approach: re-fetch entitlements from RevenueCat rather
    // than trusting the webhook payload's shape for every event type.
    const rcRes = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
      { headers: { Authorization: `Bearer ${REVENUECAT_SECRET_KEY.value()}` } }
    );

    if (!rcRes.ok) {
      res.status(502).send('RevenueCat lookup failed');
      return;
    }

    const json: any = await rcRes.json();
    const resolved = resolveFromEntitlements(json?.subscriber?.entitlements);
    await writeSubscription(appUserId, resolved);

    res.status(200).send('ok');
  }
);
