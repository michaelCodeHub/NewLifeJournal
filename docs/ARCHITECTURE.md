# Architecture — how Bloom & Bump works "without a backend"

## Short answer

There is no custom server (no Express/Nest/Django API, no database you run). The app talks **directly to Firebase**, Google's hosted backend-as-a-service:

- **Firebase Authentication** — sign-in (Google, email/password). Issues the user an ID token.
- **Cloud Firestore** — the database. The app reads and writes documents directly with the Firebase JS SDK.
- **Firestore / Storage Security Rules** — run on Google's servers on every request. They are *the* access-control layer: "a user can only read/write `users/{their uid}/…`", "community posts must have these exact fields", etc. This is what replaces API-endpoint authorisation.
- **Cloud Storage** — chat attachments (images/PDFs).
- **Cloud Functions** — a small amount of server code, used **only** where a secret or a trusted decision is needed (AI keys, subscription checks, account deletion). Four functions in total.

Everything else — week calculation, timeline grouping, charts, PDF export, reminders, theme — runs on the phone.

So "the backend" is really: Firebase config + `firestore.rules` + `storage.rules` + `firestore.indexes.json` + `functions/`. All of it is in this repo and must be **deployed** to the Firebase project (`newlifejournal-e6826`) to take effect.

```
┌──────────────────────────── Phone (Expo / React Native) ────────────────────────────┐
│ Screens (app/)  →  Contexts (context/)  →  Services (services/firebase/*)            │
│                                                                                      │
│  local only: notifications · PDF/print · share sheet · theme · consent · haptics     │
└───────┬───────────────┬────────────────┬───────────────────┬────────────────┬────────┘
        │ ID token      │ read/write      │ upload/download   │ httpsCallable   │ native SDK
        ▼               ▼                 ▼                   ▼                 ▼
  Firebase Auth   Cloud Firestore    Cloud Storage      Cloud Functions    Analytics /
  (Google, email) ▲ firestore.rules  ▲ storage.rules    aiChat ──────────► Crashlytics /
                  │ checks every     │ checks every     syncSubscription   Performance
                  │ request          │ request          revenueCatWebhook ◄── RevenueCat
                                                        deleteAccount
                                                           │
                                                           ▼
                                               Anthropic / OpenAI / Gemini
                                               (key in Secret Manager)
```

## What runs where

| Concern | Where it runs | Code |
|---|---|---|
| Sign-in / session | Firebase Auth + device (token persisted in AsyncStorage) | `config/firebase.ts`, `context/AuthContext.tsx`, `services/googleAuth.ts`, `services/emailAuth.ts` |
| Journal data (pregnancy, visits, symptoms, milestones, kicks, contractions, checklist, birth plan, chat history) | Firestore, written directly by the client | `services/firebase/*`, `context/PregnancyContext.tsx` |
| Who may read/write what | Firestore/Storage rules (server) | `firestore.rules`, `storage.rules` |
| Weekly baby/mother content | Bundled in the app (`constants/pregnancyWeeks.ts`); Firestore `pregnancyWeeks/week{N}` overrides it when seeded and is what the AI function reads | `services/firebase/weekInfoService.ts`, `functions/scripts/seedWeekData.js` |
| Growth illustrations | Bundled in the app (`assets/pregnancy-growth-weeks/*.webp`) | `constants/pregnancyGrowthImages.ts` |
| Community feed, likes, comments, reports, blocks | Firestore, validated field-by-field by rules | `services/firebase/communityService.ts`, `components/community/*` |
| AI assistant | Cloud Function `aiChat` → AI provider | `functions/src/aiChat.ts`, `services/ai/providers/backendService.ts` |
| Plus subscription | RevenueCat SDK on device; entitlement verified by `syncSubscription` + `revenueCatWebhook` | `services/subscriptionService.ts`, `functions/src/subscription.ts` |
| Account deletion | Cloud Function `deleteAccount` | `functions/src/deleteAccount.ts`, `services/firebase/accountService.ts` |
| Reminders | **Local** notifications scheduled on the device (no push server), re-synced whenever visits or the pregnancy change; cancelled on sign-out | `services/notificationService.ts`, `hooks/useReminderSync.ts` |
| PDF export & share timeline | On device (`expo-print`, `expo-sharing`, OS share sheet). Nothing is uploaded. | `utils/exportUtils.ts`, `utils/shareUtils.ts` |
| Offline | Firestore cache: persistent on web, in-memory on iOS/Android (writes queue and sync on reconnect; not kept across an app restart) | `config/firebase.ts`, `services/offlineService.ts`, `components/OfflineBanner.tsx` |
| Analytics / crashes / perf | `@react-native-firebase/*` native modules, each only with its own opt-in (analytics; crash reports + performance), only in native builds. Auto-collection and ad personalisation are off in `firebase.json` | `services/monitoring/*` |
| Theme, consent flags, notification settings, live kick/contraction sessions, form drafts, rating-prompt state | AsyncStorage on the device | `context/ThemeContext.tsx`, `services/monitoring/consent.ts`, `hooks/useStoredSession.ts`, `hooks/useFormDraft.ts`, `services/reviewPrompt.ts` |

## Data model (Firestore)

```
users/{uid}                                  profile: email, name, picture, currentMode, lastLogin, createdAt
  │                                          + server-only: subscription{…}, aiUsage{…}, devTierOverride
  ├─ pregnancies/{pregnancyId}               motherName, dueDate, status ('active' | 'completed'), babyName?, …
  │    ├─ hospitalVisits/{id}
  │    ├─ symptoms/{id}
  │    ├─ milestones/{id}
  │    ├─ kickSessions/{id}
  │    ├─ contractionSessions/{id}
  │    ├─ checklistItems/{id}
  │    ├─ birthPlan/main
  │    └─ chatMessages/{id}
  ├─ babies/{babyId}                         name, birthDate, birthWeight?, birthHeight?, gender?, fromPregnancyId?, status
  │    ├─ activities/{id}                    type: feeding | diaper | sleep, startedAt, endedAt? (missing = timer running),
  │    │                                     feeding{feedType, side?, amountMl?}, diaper{kind, color?}, notes
  │    ├─ growth/{id}                        date, weightKg?, heightCm?, headCm?
  │    ├─ health/{id}                        type: vaccine | checkup | illness | medicine, date, title, nextDate?
  │    └─ chatMessages/{id}                  the AI conversation in baby mode
  ├─ blocked/{blockedUid}                    { createdAt, name? }
  └─ private/aiRate                          server-only AI rate-limit counters

communityPosts/{postId}                      userId, authorName, authorPhoto, content, pregnancyWeek, likesCount, commentsCount, createdAt, updatedAt
  ├─ likes/{uid}
  └─ comments/{commentId}

reports/{reportId}                           reporterId, targetType, postId, commentId?, reason, createdAt (+ status/resolvedBy/resolvedAt by moderators)

pregnancyWeeks/week{N}                       babySize, babyLength, babyWeight, babyDevelopment[], motherChanges[], tips, dailyTips, pregnancyInfo
```

The current pregnancy week is **always derived from `dueDate`** (weeks since due date − 40 weeks, clamped 1–42) — it is not stored and trusted.

Storage:

```
chatAttachments/{uid}/{pregnancyId}/{file}   owner only, image/* or PDF, < 10 MB
weekImages/{file}                            read-only for signed-in users (unused — the app ships bundled images)
```

## Security model

Because the client writes to the database directly, **the rules are the backend's authorisation code**. Key protections in `firestore.rules`:

- Users can only touch `users/{their uid}/**`.
- On their own profile doc, clients may write only `email, name, picture, currentMode, lastLogin, createdAt`. `subscription`, `aiUsage` and `devTierOverride` are server-only — a user can't grant themselves Plus or reset their AI quota.
- `private/*` is server-only (AI rate limits).
- Community writes are validated: exact field set, types, length limits (post 2000 chars, comment 1000), author must equal caller, timestamps must be server time, like/comment counters can only move by ±1.
- Reports can be created but never read back by normal users; moderators (custom claim `moderator` or `admin`) can read and close them and delete any post/comment.
- `pregnancyWeeks` is read-only for every client.
- Everything not listed is denied.

Rules are tested against the emulator: `rules-tests/firestore.rules.test.ts` (`npm run test:rules`).

Roles are **Firebase Auth custom claims**, set from a trusted machine:

| Claim | Grants | How to set |
|---|---|---|
| `moderator: true` | Profile → Moderation, reports queue, delete any community content | `node functions/scripts/setModerator.js <email>` |
| `admin: true` | Same as moderator (reserved for staff) | Admin SDK: `setCustomUserClaims(uid, { admin: true })` |

The user must sign out and in again for a new claim to take effect.

Plans aren't a claim: Plus for test/comped accounts is the server-only profile field `devTierOverride`, set with `node functions/scripts/setPlan.js <email> plus` — see [TESTING_AND_PLANS.md](TESTING_AND_PLANS.md).

## Cloud Functions

All in `functions/src/`, Node 22, Firebase Functions v2. Deployed with `firebase deploy --only functions`.

| Function | Type | Purpose |
|---|---|---|
| `aiChat` | callable | Validates the conversation, enforces limits, builds the system prompt **on the server** from the user's own Firestore data, calls the configured AI provider, returns the reply. |
| `syncSubscription` | callable | Asks RevenueCat (server-to-server, secret key) for the caller's real entitlement and mirrors it to `users/{uid}.subscription`. Called after purchase/restore and on app foreground. |
| `revenueCatWebhook` | HTTPS | RevenueCat calls it on renewals/cancellations/refunds; checks the shared secret, re-fetches the entitlement, updates Firestore. |
| `deleteAccount` | callable | Deletes the user's community posts (with likes/comments), their likes/comments on others' posts (keeping counters right), everything under `users/{uid}`, their chat attachments, and finally the Auth user. Requires a sign-in within the last 15 minutes. |

### The AI chat request, step by step

1. User sends a message in Chat (after accepting the one-time AI consent).
2. `BackendAIService` calls `aiChat` with only `{ role, content, images? }` for recent turns, plus `babyId` in baby mode. Any client-sent system prompt or model settings are ignored.
3. `aiChat` rejects unauthenticated calls (and, if `ENFORCE_APP_CHECK=true`, calls without App Check).
4. It sanitises input: max 20 turns, 4,000 chars per message, 24,000 total, max 3 images (JPEG/PNG/WebP/GIF, ≈3 MB each).
5. In a Firestore transaction it checks limits and reserves a slot: **6 messages/minute and 150/day for everyone; 15/month for free users** (calendar month, UTC).
6. It builds the system prompt server-side (`systemPrompt.ts`): fixed safety rules + the user's current week and due date, baby name, this week's content, recent symptoms (and the most frequent ones), recent and upcoming visits, and recent milestones. In baby mode (a valid `babyId` under the caller's own `users/{uid}`) it uses the baby instead: age, birth stats, last-24-hour feeds/diapers/sleep, latest growth record and health entries, with an early-parenthood tone. Free-text notes are clipped so they can't blow up the prompt.
7. It calls Anthropic / OpenAI / Gemini / a custom URL according to `AI_PROVIDER`, with the key from Secret Manager.
8. If the user's message matches an emergency red-flag pattern (heavy bleeding, reduced movements, waters breaking, severe headache/vision changes, fever, chest pain, self-harm…), the reply is prefixed with a "call your emergency number / maternity unit now" notice regardless of what the model says.
9. On provider failure the free-tier slot is refunded and a generic error is returned (provider errors stay in the logs).
10. **Streaming.** The app asks for a streamed reply (`services/ai/streamAiChat.ts`: the callable streaming protocol over `expo/fetch` on phones, the browser fetch on web; the emulator uses the normal call). With Claude, `aiChat` forwards each piece of text as it is written (`{ t }` chunks; `{ reset }` if the server-side refusal fallback takes over) and still returns the complete reply at the end, which is what the app saves. Other providers answer in one piece. Older app builds that don't ask for streaming get the normal reply. Claude is called without `temperature` (current models reject it), with adaptive thinking (so `max_tokens` is at least 4,096), effort `low`, and server-side refusal fallbacks (`fallbacks: "default"`); if the whole chain declines, a kind "ask your midwife or doctor" reply is returned instead of a partial answer.
11. Replies are Markdown; the app renders them with `components/chat/MarkdownText.tsx` (`lib/markdown.ts`: paragraphs, headings, lists, quotes, code, bold/italic, http(s) links).

### The subscription flow

1. Device configures RevenueCat with the Firebase uid as the app user id.
2. User buys Plus in the paywall (Apple/Google handle payment).
3. App calls `syncSubscription`; the function verifies with RevenueCat and writes `subscription` to the profile.
4. The app (`SubscriptionContext`) and `aiChat` both resolve the tier from that server-written field. An expired `expiresAt` counts as free, so a missed webhook can't leave someone on Plus forever.

## App structure (client)

```
app/                         Expo Router (file-based routes)
  _layout.tsx                providers, fonts, splash, auth/mode routing guard
  index.tsx                  redirect: login → onboarding → pregnancy home
  (auth)/login.tsx           Google + email/password sign-in, password reset
  (onboarding)/              choose-mode, create-pregnancy, create-baby
  (pregnancy)/(tabs)/        bottom tabs: Home · Timeline · Tools · Ask (chat.tsx) · You (profile.tsx)
  (pregnancy)/*.tsx          visits, symptoms, kickcounter, contractiontimer, charts,
                             checklist, birthplan, export, sharetimeline, notifications,
                             community, moderation, blocked, paywall, editpregnancy
  (pregnancy)/arrived.tsx    "Baby has arrived" celebration + baby form (pregnancy → baby transition)
  (baby)/(tabs)/             baby mode tabs: Home · Timeline · Tools · Ask (shared ChatScreen) · You
  (baby)/*.tsx               growth, health, editbaby, pregnancy-history ("Before you were born")
components/ui/               design-system kit (Screen, Sheet, Button, Fields, Toast…) — see components/ui/README.md
components/{baby,chat,community,insights,prep,profile,timers}/   feature components
context/                     AuthContext, PregnancyContext, BabyContext, ChatbotContext, SubscriptionContext, ThemeContext
services/firebase/           one service per collection
services/ai/                 client stub that calls the aiChat function
services/monitoring/         analytics, crash reporting, consent (all no-ops without native modules)
lib/                         featurePriority (stage-aware tool ordering), journal (edit helpers), haptics
constants/                   features (release switches), legal, growth images
functions/                   Cloud Functions (server)
firestore.rules · storage.rules · firestore.indexes.json · firebase.json
```

**Modes.** `users/{uid}.currentMode` ('pregnancy' | 'baby') decides where `AuthGate` sends the user and which conversation `ChatbotContext` uses (`ChatScope`: under the pregnancy or under the baby). `setCurrentMode` in `AuthContext` switches it. `BABY_MODE_ENABLED` in `constants/features.ts` can turn baby mode off entirely.

State flows one way: Firestore real-time listeners (`onSnapshot`) in `PregnancyContext` push data into React context; screens read from context and call service functions to write; the listener then delivers the change back to every screen.

## Known gaps / limitations

- **Weekly content for the AI must be seeded.** The app shows the bundled copy when `pregnancyWeeks` is empty, but the `aiChat` function only sees what's in Firestore. Run `functions/scripts/seedWeekData.js` once per project (see [SETUP_AND_DEPLOY.md](SETUP_AND_DEPLOY.md#seed-weekly-content)).
- **Plus gating is client-side only.** `PremiumGate` hides Plus screens in the app, but the rules let any signed-in user read/write `communityPosts`, and charts/birth plan/export use the user's own data. Only the AI quota is enforced on the server. Acceptable for v1; tighten rules (check `subscription` on the profile) if it matters.
- **PDF chat attachments** are uploaded and shown but never sent to the model (only images are).
- Reminders sync while the app is open in the pregnancy section (and once a day for the rolling "You're now week N" window); nothing reschedules them in the background.
- Email verification is sent on sign-up but never enforced.
- **Native offline** survives connectivity loss but not an app restart (Firebase JS SDK has no on-disk cache on React Native). Needs `@react-native-firebase/firestore` — planned for v1.1.
- **Reminders are local**; there is no server push (FCM) — reminders aren't sent if the app is uninstalled or the device is replaced.
- **App Check** is wired but off (`ENFORCE_APP_CHECK=false`) until Play Integrity / App Attest are configured.
