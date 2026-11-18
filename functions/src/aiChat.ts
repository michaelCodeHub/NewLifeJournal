import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineBoolean, defineSecret, defineString } from 'firebase-functions/params';
import { db, admin } from './admin';
import { AiChatRequest, AIMessage, StreamSink, callAnthropic, callOpenAI, callGemini, callCustom } from './aiProviders';
import { buildServerSystemPrompt } from './systemPrompt';
import { resolveTier } from './tier';

// Secrets (set with `firebase functions:secrets:set NAME`) — never exposed to the client.
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const CUSTOM_AI_KEY = defineSecret('CUSTOM_AI_KEY');

// Non-secret config params (functions/.env or prompted at deploy).
const AI_PROVIDER = defineString('AI_PROVIDER', { default: 'anthropic' });
const AI_MODEL = defineString('AI_MODEL', { default: '' });
const CUSTOM_AI_URL = defineString('CUSTOM_AI_URL', { default: '' });
/** Turn on once the app ships with App Check (Play Integrity / DeviceCheck) configured. */
const ENFORCE_APP_CHECK = defineBoolean('ENFORCE_APP_CHECK', { default: false });

// Must match FREE_AI_MESSAGE_LIMIT in types/subscription.ts on the client —
// this is the value that actually matters since it's enforced here, server-side.
const FREE_AI_MESSAGE_LIMIT = 15;

/** Abuse limits, for every tier (protects the provider bill). */
const LIMITS = {
  perMinute: 6,
  perDay: 150,
  maxMessages: 20, // only the most recent turns are forwarded
  maxCharsPerMessage: 4000,
  maxTotalChars: 24000,
  maxImages: 3,
  maxImageBase64Chars: 4_000_000, // ≈ 3 MB image
  imageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxTokens: 1024,
  temperature: 0.6,
};

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-5-5',
  openai: 'gpt-4o',
  gemini: 'gemini-1.5-pro',
  custom: '',
};

/**
 * Red flags in the user's latest message. When one matches, the reply is
 * prefixed with an emergency notice regardless of what the model says, so the
 * escalation never depends on the model following its instructions.
 */
const RED_FLAGS: RegExp[] = [
  /\b(heavy|lots of|a lot of|soaking|gushing)\b.{0,20}\bbleed/i,
  /\bbleeding\b.{0,30}\b(clots?|won'?t stop|heavy)\b/i,
  /\b(waters?|fluid)\b.{0,20}\b(broke|breaking|leak)/i,
  /\b(baby|bub)\b.{0,30}\b(not moving|stopped moving|isn'?t moving|less movement|moving less|no movement)/i,
  /\b(no|reduced|fewer)\b.{0,10}\b(kicks|movements?)\b/i,
  /\b(severe|worst|unbearable|constant)\b.{0,20}\b(pain|headache|cramp)/i,
  /\b(blurr(y|ed) vision|seeing spots|flashing lights)\b/i,
  /\b(seizure|fit|fainted|passed out|unconscious)\b/i,
  /\b(chest pain|can'?t breathe|cannot breathe|struggling to breathe)\b/i,
  /\b(fever|temperature)\b.{0,20}\b(3[89]|10[0-9])/i,
  /\b(suicid|kill myself|end my life|self[- ]harm|hurt myself)/i,
  // Newborn / infant emergencies (baby mode).
  /\b(blue|grey|gray)\b.{0,20}\b(lips|skin|face|tongue)\b/i,
  /\b(not breathing|stopped breathing|breathing (fast|hard|strange)|grunting|gasping)\b/i,
  /\b(floppy|unresponsive|limp|won'?t wake|hard to wake|can'?t wake)\b/i,
  /\b(no wet|dry) (nappies|nappy|diapers?)\b/i,
  /\b(won'?t|refus\w*)\b.{0,15}\b(feed|eat|drink)/i,
  /\b(vomit\w*|throwing up)\b.{0,20}\b(green|blood)/i,
  /\b(bulging|sunken)\b.{0,15}\b(soft spot|fontanel)/i,
  /\brash\b.{0,30}\b(doesn'?t fade|not fading|purple)/i,
];

const EMERGENCY_NOTICE =
  'Important: what you describe can need urgent care. Please call your local emergency number, your maternity unit or your baby’s doctor now — don’t wait for symptoms to get worse.\n\n';

/** Validates and trims the client payload. Only role/content/images survive; everything else is ignored. */
function sanitizeMessages(raw: unknown): AIMessage[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new HttpsError('invalid-argument', 'messages[] is required.');
  }
  const recent = raw.slice(-LIMITS.maxMessages);
  let total = 0;
  let images = 0;
  const out: AIMessage[] = recent.map((m: any) => {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
      throw new HttpsError('invalid-argument', 'Each message needs role "user" or "assistant" and text content.');
    }
    if (m.content.length > LIMITS.maxCharsPerMessage) {
      throw new HttpsError('invalid-argument', `Messages can be at most ${LIMITS.maxCharsPerMessage} characters.`);
    }
    total += m.content.length;
    const msg: AIMessage = { role: m.role, content: m.content };
    if (Array.isArray(m.images) && m.images.length > 0) {
      if (m.role !== 'user') throw new HttpsError('invalid-argument', 'Only user messages can carry images.');
      msg.images = m.images.map((img: any) => {
        images += 1;
        if (
          !img ||
          typeof img.base64 !== 'string' ||
          img.base64.length > LIMITS.maxImageBase64Chars ||
          !LIMITS.imageTypes.includes(img.mimeType)
        ) {
          throw new HttpsError('invalid-argument', 'Images must be JPEG, PNG, WebP or GIF and under 3 MB.');
        }
        return { base64: img.base64, mimeType: img.mimeType };
      });
    }
    return msg;
  });
  if (total > LIMITS.maxTotalChars) {
    throw new HttpsError('invalid-argument', 'This conversation is too long. Start a new chat to continue.');
  }
  if (images > LIMITS.maxImages) {
    throw new HttpsError('invalid-argument', `You can attach at most ${LIMITS.maxImages} images.`);
  }
  if (out[out.length - 1].role !== 'user') {
    throw new HttpsError('invalid-argument', 'The last message must be from the user.');
  }
  // Providers expect the conversation to open with a user turn.
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

export const aiChat = onCall(
  {
    secrets: [ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, CUSTOM_AI_KEY],
    cors: true,
    memory: '512MiB',
    timeoutSeconds: 90,
  },
  async (request, response) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in to use the AI assistant.');
    }
    if (ENFORCE_APP_CHECK.value() && !request.app) {
      throw new HttpsError('failed-precondition', 'Please update the app to keep using the assistant.');
    }
    const uid = request.auth.uid;
    const messages = sanitizeMessages((request.data as AiChatRequest | undefined)?.messages);
    // Baby mode: which of the caller's babies to use for context. Only ever
    // read under users/{uid}, so another user's id simply finds nothing.
    const rawBabyId = (request.data as { babyId?: unknown } | undefined)?.babyId;
    const babyId = typeof rawBabyId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(rawBabyId) ? rawBabyId : undefined;

    const userRef = db.collection('users').doc(uid);
    // Rate-limit state lives in a server-only document (firestore.rules denies
    // all client access to users/{uid}/private/*).
    const rateRef = userRef.collection('private').doc('aiRate');

    // Enforce the per-minute/day abuse limits and the free-tier monthly cap,
    // and reserve a usage slot atomically, *before* calling the paid provider.
    const reservation = await db.runTransaction(async (tx) => {
      const [snap, rateSnap] = await Promise.all([tx.get(userRef), tx.get(rateRef)]);
      const profile = snap.data();
      const tier = resolveTier(profile);
      const now = Date.now();

      const rate = rateSnap.data() ?? {};
      const minuteStart = typeof rate.minuteStart === 'number' && now - rate.minuteStart < 60_000 ? rate.minuteStart : now;
      const minuteCount = minuteStart === rate.minuteStart ? rate.minuteCount ?? 0 : 0;
      const dayKey = new Date(now).toISOString().slice(0, 10);
      const dayCount = rate.dayKey === dayKey ? rate.dayCount ?? 0 : 0;
      if (minuteCount >= LIMITS.perMinute) return { tier, limited: 'minute' as const, messagesUsedThisPeriod: 0 };
      if (dayCount >= LIMITS.perDay) return { tier, limited: 'day' as const, messagesUsedThisPeriod: 0 };

      let messagesUsedThisPeriod = profile?.aiUsage?.messagesUsedThisPeriod ?? 0;
      if (tier === 'free') {
        // Calendar month in UTC; resets on the 1st. The client shows the same rule.
        const nowDate = new Date(now);
        const existing = profile?.aiUsage as
          | { messagesUsedThisPeriod: number; periodStart: FirebaseFirestore.Timestamp }
          | undefined;
        const periodStart = existing?.periodStart?.toDate();
        const samePeriod =
          !!periodStart &&
          periodStart.getUTCFullYear() === nowDate.getUTCFullYear() &&
          periodStart.getUTCMonth() === nowDate.getUTCMonth();
        const currentCount = samePeriod ? existing!.messagesUsedThisPeriod : 0;
        if (currentCount >= FREE_AI_MESSAGE_LIMIT) {
          return { tier, limited: 'month' as const, messagesUsedThisPeriod: currentCount };
        }
        messagesUsedThisPeriod = currentCount + 1;
        tx.set(
          userRef,
          {
            aiUsage: {
              messagesUsedThisPeriod,
              periodStart: samePeriod
                ? existing!.periodStart
                : admin.firestore.Timestamp.fromDate(new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), 1))),
            },
          },
          { merge: true }
        );
      }

      tx.set(rateRef, { minuteStart, minuteCount: minuteCount + 1, dayKey, dayCount: dayCount + 1 });
      return { tier, limited: null, messagesUsedThisPeriod };
    });

    if (reservation.limited === 'month') {
      throw new HttpsError(
        'resource-exhausted',
        `You've used all ${FREE_AI_MESSAGE_LIMIT} free AI messages this month. Upgrade to Plus for unlimited answers.`
      );
    }
    if (reservation.limited === 'minute') {
      throw new HttpsError('resource-exhausted', "You're sending messages quickly. Please wait a minute and try again.");
    }
    if (reservation.limited === 'day') {
      throw new HttpsError('resource-exhausted', "You've reached today's message limit. It resets tomorrow.");
    }

    const provider = AI_PROVIDER.value() || 'anthropic';
    const model = AI_MODEL.value() || DEFAULT_MODELS[provider] || DEFAULT_MODELS.anthropic;
    const lastUserText = messages[messages.length - 1].content;
    const urgent = RED_FLAGS.some((re) => re.test(lastUserText));

    try {
      const data: AiChatRequest = {
        messages,
        systemPrompt: await buildServerSystemPrompt(uid, babyId),
        temperature: LIMITS.temperature,
        maxTokens: LIMITS.maxTokens,
      };
      // Streaming clients get the reply as it is written: { t } appends text, { reset }
      // clears it. The final return value is always the complete reply and wins.
      // Only Claude streams; the other providers answer in one piece.
      let sink: StreamSink | undefined;
      if (request.acceptsStreaming && response) {
        const send = (chunk: { t?: string; reset?: true }) => {
          response.sendChunk(chunk).catch(() => {
            /* client went away; the reply is still saved by the client on return */
          });
        };
        sink = {
          text: (t) => send({ t }),
          reset: () => {
            send({ reset: true });
            if (urgent) send({ t: EMERGENCY_NOTICE });
          },
        };
        if (urgent) send({ t: EMERGENCY_NOTICE });
      }
      let result;
      switch (provider) {
        case 'anthropic':
          result = await callAnthropic(data, ANTHROPIC_API_KEY.value(), model, sink);
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
        content: urgent ? EMERGENCY_NOTICE + result.content : result.content,
        urgent,
        usage: result.usage,
        aiUsage: {
          messagesUsedThisPeriod: reservation.messagesUsedThisPeriod,
          limit: FREE_AI_MESSAGE_LIMIT,
          tier: reservation.tier,
        },
      };
    } catch (err: any) {
      // Refund the reserved monthly slot on failure so free-tier users aren't
      // charged for an error the provider threw.
      if (reservation.tier === 'free') {
        await userRef
          .update({ 'aiUsage.messagesUsedThisPeriod': admin.firestore.FieldValue.increment(-1) })
          .catch(() => {
            /* best-effort refund; don't mask the original error */
          });
      }
      if (err instanceof HttpsError) throw err;
      // Don't leak provider error bodies to the client; keep them in the logs.
      console.error('[aiChat] provider error', err?.message);
      throw new HttpsError('unavailable', 'The assistant is unavailable right now. Please try again shortly.');
    }
  }
);
