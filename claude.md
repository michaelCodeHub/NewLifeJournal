# Bloom & Bump — project guide for Claude

Pregnancy + baby journal app (Expo / React Native) on Firebase. Two modes, chosen by `users/{uid}.currentMode`: pregnancy and baby (baby mode can be switched off with `constants/features.ts` → `BABY_MODE_ENABLED`).

Full documentation lives in `docs/` — read the relevant file before large changes:

- `docs/ARCHITECTURE.md` — how it works without a custom backend, data model, rules, Cloud Functions, known gaps
- `docs/ENVIRONMENT.md` — every env var, secret and config file
- `docs/SETUP_AND_DEPLOY.md` — run, test, emulators, deploy, EAS
- `docs/PRODUCT_GUIDE.md` — what the app does, screen by screen (non-technical)
- `docs/CHANGES_MAIN_TO_DEV.md` — what `dev` changed relative to the client's `main`
- `docs/V1_RELEASE_PLAN.md` — client's v1.0 requirements (PRD_v1.0.md) vs `dev`, gaps and the plan; baby mode is P0 in the PRD
- `docs/TESTING_AND_PLANS.md` — test accounts, Plus for testers, sandbox purchases, how plans are managed
- `components/ui/README.md` — UI kit rules (follow them for any screen work)

## Branches

- `main` — the client's code (up to `d70000c`, Aug 2026).
- `dev` — `main` + the Nov 2026 launch-readiness work. Active branch.

## Stack

Expo SDK 58 · React Native 0.88 · React 19 · TypeScript 6 · Expo Router (file-based) · Firebase JS SDK 12 (Auth, Firestore, Storage, Functions) · `@react-native-firebase` for Analytics/Crashlytics/Perf · RevenueCat (`react-native-purchases`) · Cloud Functions on Node 22. Requires **Node 22.13+**.

## How it fits together

- No custom server. The app reads/writes Firestore directly; **`firestore.rules` / `storage.rules` are the authorisation layer** — any new collection or field needs a rule (and a test in `rules-tests/`).
- Cloud Functions (`functions/src/`) only for things needing a secret or trust: `aiChat`, `syncSubscription`, `revenueCatWebhook`, `deleteAccount`.
- No test logins or dummy data in the app. Test by creating real accounts (emulator or dev project); give Plus with `functions/scripts/setPlan.js`, moderator with `setModerator.js` — see `docs/TESTING_AND_PLANS.md`.
- AI provider keys live **only** in Secret Manager. Never add an AI or RevenueCat secret key to `.env` / `app.config.js` — every `EXPO_PUBLIC_*` value ships in the app bundle.
- The client never writes `subscription`, `aiUsage` or `devTierOverride` on `users/{uid}`; the rules reject it.
- Current week is always derived from `pregnancy.dueDate` (`calculatePregnancyWeek`), never stored.
- Data flows through `context/PregnancyContext.tsx` / `context/BabyContext.tsx` (Firestore `onSnapshot` listeners); screens call `services/firebase/*` to write.
- Baby timers (feed/sleep) are activities without `endedAt`; never keep timer state only in React state.
- Chat lives under the pregnancy or the baby (`ChatScope` in `services/firebase/chatbotService.ts`); the server builds the prompt for either (`functions/src/systemPrompt.ts`).

## Layout

```
app/(auth)/            login (Google + email/password)
app/(onboarding)/      choose-mode, create-pregnancy, create-baby
app/(pregnancy)/(tabs)/home, timeline, tools, chat ("Ask"), profile ("You")
app/(pregnancy)/*.tsx  visits, symptoms, kickcounter, contractiontimer, charts, checklist, birthplan,
                       export, sharetimeline, notifications, community, moderation, blocked, paywall,
                       editpregnancy, arrived ("Baby has arrived")
app/(baby)/(tabs)/     home, timeline, tools, chat (shared ChatScreen), profile
app/(baby)/*.tsx       growth, health, editbaby, pregnancy-history
components/ui/         design-system kit
components/<feature>/  baby, chat, community, insights, prep, profile, timers
context/  services/  lib/  constants/  types/  utils/
functions/             Cloud Functions
```

## Conventions

- UI: follow `components/ui/README.md` — theme tokens via `useTheme()`, `Text` from the kit, `Sheet`/`ConfirmSheet`/`useToast` (never `Alert.alert`, it's a no-op on web), `useThemedStyles(makeStyles)`. Light and dark must both work.
- Native modules (RevenueCat, RNFB, Google Sign-In) are lazy-required and guarded so the app still runs on web / Expo Go. Keep that pattern.
- Analytics never carries health data (param allowlist in `services/monitoring/analytics.ts`) and only fires with consent.
- Dates in Firestore are `Timestamp`s.

## Commands

```bash
npm install && (cd functions && npm install)
npx expo start                     # dev server (use a dev build for native modules)
EXPO_PUBLIC_USE_EMULATOR=1 npx expo start --web -c   # against local emulators
npx firebase emulators:start --project newlifejournal-e6826
npx tsc --noEmit -p .              # type check
npm test                           # Jest
npm run test:rules                 # Firestore rules tests (needs Java)
npx firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```

## Git workflow

- **Do not commit until asked.** The user will explicitly request commits.
- Work on `dev`; don't push to `main` without being asked.
