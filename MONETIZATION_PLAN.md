# Bloom & Bump — Free / Premium Tier Plan

## Why RevenueCat

The app is Expo + Firebase with no billing code yet. Apple and Google both require
native In-App Purchase for unlocking functionality inside an iOS/Android app (a Stripe
web checkout is not acceptable for gating in-app features on iOS). RevenueCat sits on
top of StoreKit/Play Billing, so it was chosen over rolling native IAP by hand because:

- One SDK (`react-native-purchases`) covers iOS + Android with an Expo config plugin.
- It validates receipts server-side and exposes a simple "entitlements" API instead of
  raw store transactions.
- Free tier of RevenueCat's own pricing covers this app's scale.
- Firebase stays the source of truth for the rest of the app's data; RevenueCat is only
  asked "is this uid entitled to `premium`?" — that boolean gets mirrored into Firestore
  so the rest of the app (Firestore rules, other services) can read it without an extra
  network call.

## Tier definition

**Free** (forever, no card required)
- Full core tracking: home, timeline, hospital visits, symptoms, kick counter,
  contraction timer, notifications, checklist, profile.
- AI Assistant: capped at **15 messages / calendar month**. Counter resets on the 1st.
- Community: read-only (browse posts, no posting/commenting) — see open question below.

**Premium** (subscription, e.g. $4.99/mo or $29.99/yr)
- Unlimited AI Assistant messages.
- Health Charts (weight/BP trend graphs).
- PDF Export (visit/symptom report).
- Birth Plan builder.
- Share Timeline (formatted share/export of the journey).
- Community: full posting/commenting privileges.

Rationale for the split: AI calls are the app's only real variable cost (OpenAI/
Anthropic/Gemini tokens), so capping it protects margin regardless of subscriber count.
Charts, export, birth plan, and share are "graduation" features people reach for near
the point they're emotionally invested in the app — natural upgrade moments — and they
cost nothing to gate.

## Data model changes

`users/{uid}` document gets two new (optional, backward-compatible) fields:

```ts
subscription?: {
  tier: 'free' | 'premium';
  status: 'active' | 'trialing' | 'expired' | 'cancelled' | 'none';
  productId?: string | null;
  expiresAt?: Timestamp | null;
  willRenew?: boolean;
  updatedAt: Timestamp;
};
aiUsage?: {
  messagesUsedThisPeriod: number;
  periodStart: Timestamp; // first-of-month marker, used to detect rollover
};
```

RevenueCat remains the source of truth for entitlement; `subscription` is a cache
written whenever `SubscriptionContext` gets a fresh `CustomerInfo` update (app open,
purchase, restore). This lets Firestore security rules and any backend logic check
tier without calling RevenueCat directly.

## New code (this session)

- `types/subscription.ts` — tier/status types, free AI limit constant, premium feature list.
- `services/subscriptionService.ts` — RevenueCat init/login/purchase/restore (lazy-loaded
  so the app doesn't crash before the native module is built), Firestore sync helpers,
  AI usage read/increment/rollover.
- `context/SubscriptionContext.tsx` — app-wide `useSubscription()` hook: `isPremium`,
  `aiMessagesRemaining`, `canSendAiMessage`, `recordAiMessage()`, `purchase()`, `restore()`.
- `components/PremiumGate.tsx` — drop-in wrapper that shows an upsell card instead of a
  screen's content when the user isn't premium.
- `app/(pregnancy)/paywall.tsx` — plan comparison + purchase/restore screen.
- Gated: `chat.tsx` (message cap + upgrade prompt), `charts.tsx`, `export.tsx`,
  `birthplan.tsx`, `sharetimeline.tsx` (full `PremiumGate` wrap).
- `app/_layout.tsx` wrapped in `SubscriptionProvider`.

## What you still need to do outside this session

1. Create a RevenueCat account, add the app, create `premium` entitlement, and create
   the actual subscription products in App Store Connect / Google Play Console
   (RevenueCat can't invent store products for you).
2. Add `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` to `.env`.
3. `npx expo prebuild` (or EAS build) after `npm install` picks up
   `react-native-purchases`, since it's a native module — it will not work in Expo Go.
4. Test purchases via TestFlight/sandbox accounts (iOS) and a Play Console license
   tester (Android) — the simulator/emulator can't complete real purchases.
5. Decide the community read/write split (flagged as an open question below) and
   confirm the $ price points.
6. Optional: a Firebase Cloud Function listening to RevenueCat webhooks, so entitlement
   changes (renewals, cancellations, refunds) update Firestore even when the app isn't
   open — the client-side sync in this plan only updates on app foreground/purchase.

## Open questions

- Should free users be able to **read** community posts, or is community entirely
  premium? Scaffold currently gates the whole screen; easy to loosen to read-only later.
- Trial period? (e.g. 7-day free trial of premium) — configurable entirely in
  RevenueCat/App Store Connect, no extra app code needed once wired up.
- Grandfather existing users as premium for a period, or launch tiers cold?

## Rollout order

1. Ship the free/premium code path with **everyone treated as free** except a manual
   Firestore override (there's a `dev override` toggle stubbed in `admin.tsx` — remove
   before shipping) so you can validate gating UX before store products exist.
2. Set up RevenueCat + store products, wire real purchases.
3. Add server-side webhook sync (step 6 above) before charging real money, so refunds/
   cancellations can't leave a user permanently premium.
4. Flip on for a small percentage of users / TestFlight first.
