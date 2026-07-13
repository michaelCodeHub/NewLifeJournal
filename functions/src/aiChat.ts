import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import { db, admin } from './admin';
import { AiChatRequest, callAnthropic, callOpenAI, callGemini, callCustom } from './aiProviders';

// Secrets (set with `firebase functions:secrets:set NAME`) — never exposed to the client.
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const CUSTOM_AI_KEY = defineSecret('CUSTOM_AI_KEY');

// Non-secret config params (set via .env / `firebase functions:config` equivalent for v2 params).
const AI_PROVIDER = defineString('AI_PROVIDER', { default: 'anthropic' });
const AI_MODEL = defineString('AI_MODEL', { default: '' });
const CUSTOM_AI_URL = defineString('CUSTOM_AI_URL', { default: '' });

// Must match FREE_AI_MESSAGE_LIMIT in types/subscription.ts on the client —
// this is the value that actually matters since it's enforced here, server-side.
const FREE_AI_MESSAGE_LIMIT = 15;

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
  gemini: 'gemini-1.5-pro',
  custom: '',
};

/**
 * Resolves the caller's tier from Firestore. `subscription.tier` and
 * `devTierOverride` are only ever written by trusted server code (this
 * functions project, via the Admin SDK) — firestore.rules blocks clients from
 * writing either field directly, so it's safe to trust them here.
 */
function resolveTier(profile: FirebaseFirestore.DocumentData | undefined): 'free' | 'premium' {
  if (profile?.devTierOverride === 'premium') return 'premium';
  if (profile?.devTierOverride === 'free') return 'free';
  return profile?.subscription?.tier === 'premium' ? 'premium' : 'free';
}

export const aiChat = onCall(
  {
    secrets: [ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, CUSTOM_AI_KEY],
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in to use the AI assistant.');
    }
    const uid = request.auth.uid;
    const data = request.data as AiChatRequest;

    if (!data || !Array.isArray(data.messages) || data.messages.length === 0) {
      throw new HttpsError('invalid-argument', 'messages[] is required.');
    }

    const userRef = db.collection('users').doc(uid);

    // Enforce the free-tier monthly cap and reserve a usage slot atomically,
    // *before* calling the (paid) AI provider. This is the actual source of
    // truth for entitlement + usage — the client can no longer bypass it by
    // writing to its own Firestore document.
    const reservation = await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const profile = snap.data();
      const tier = resolveTier(profile);

      if (tier === 'premium') {
        return { tier, messagesUsedThisPeriod: profile?.aiUsage?.messagesUsedThisPeriod ?? 0, limited: false };
      }

      const now = new Date();
      const existing = profile?.aiUsage as
        | { messagesUsedThisPeriod: number; periodStart: FirebaseFirestore.Timestamp }
        | undefined;
      const periodStart = existing?.periodStart?.toDate();
      const samePeriod =
        !!periodStart &&
        periodStart.getFullYear() === now.getFullYear() &&
        periodStart.getMonth() === now.getMonth();
      const currentCount = samePeriod ? existing!.messagesUsedThisPeriod : 0;

      if (currentCount >= FREE_AI_MESSAGE_LIMIT) {
        return { tier, messagesUsedThisPeriod: currentCount, limited: true };
      }

      const newUsage = {
        messagesUsedThisPeriod: currentCount + 1,
        periodStart: samePeriod
          ? existing!.periodStart
          : admin.firestore.Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      };
      tx.set(userRef, { aiUsage: newUsage }, { merge: true });
      return { tier, messagesUsedThisPeriod: newUsage.messagesUsedThisPeriod, limited: false };
    });

    if (reservation.limited) {
      throw new HttpsError(
        'resource-exhausted',
        `You've used all ${FREE_AI_MESSAGE_LIMIT} free AI messages this month. Upgrade to Premium for unlimited access.`
      );
    }

    const provider = AI_PROVIDER.value() || 'anthropic';
    const model = AI_MODEL.value() || DEFAULT_MODELS[provider] || DEFAULT_MODELS.anthropic;

    try {
      let result;
      switch (provider) {
        case 'anthropic':
          result = await callAnthropic(data, ANTHROPIC_API_KEY.value(), model);
          break;
        case 'openai':
          result = await callOpenAI(data, OPENAI_API_KEY.value(), model);
          break;
        case 'gemini':
          result = await callGemini(data, GEMINI_API_KEY.value(), model);
          break;
        case 'custom': {
          const url = CUSTOM_AI_URL.value();
          if (!url) throw new HttpsError('failed-precondition', 'CUSTOM_AI_URL is not configured.');
          result = await callCustom(data, url, CUSTOM_AI_KEY.value());
          break;
        }
        default:
          throw new HttpsError('failed-precondition', `Unknown AI provider: ${provider}`);
      }

      return {
        content: result.content,
        usage: result.usage,
        aiUsage: {
          messagesUsedThisPeriod: reservation.messagesUsedThisPeriod,
          limit: FREE_AI_MESSAGE_LIMIT,
          tier: reservation.tier,
        },
      };
    } catch (err: any) {
      // Refund the reserved usage slot on failure so free-tier users aren't
      // charged their monthly message for an error the provider threw.
      if (reservation.tier === 'free') {
        await userRef
          .update({ 'aiUsage.messagesUsedThisPeriod': admin.firestore.FieldValue.increment(-1) })
          .catch(() => {
            /* best-effort refund; don't mask the original error */
          });
      }
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('internal', err?.message || 'AI request failed.');
    }
  }
);
