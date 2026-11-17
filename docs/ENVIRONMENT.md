# Environment variables, secrets & config files

Everything the app needs that is **not** in git, where it goes, where to get it, and what breaks without it.

There are four separate places configuration lives. Mixing them up is the most common setup mistake.

| # | Where | Read by | Bundled into the app? | Holds |
|---|---|---|---|---|
| 1 | `.env` (repo root) | Expo / Metro at build time | **Yes — public** | Firebase web config, Google client IDs, RevenueCat *public* keys, legal URLs |
| 2 | Native Firebase files (`google-services.json`, `GoogleService-Info.plist`) | Native build (EAS / `expo run`) | Yes | Native Firebase config for Analytics, Crashlytics, Performance |
| 3 | `functions/.env` | Cloud Functions at deploy time | No (server) | Non-secret server params (AI provider, model, App Check switch) |
| 4 | Google **Secret Manager** (via `firebase functions:secrets:set`) | Cloud Functions at run time | No (server) | AI provider API keys, RevenueCat secret key & webhook secret |

> **Rule:** anything starting with `EXPO_PUBLIC_` is readable by anyone who downloads the app. Never put a secret key in `.env`. AI keys and the RevenueCat secret key belong only in Secret Manager (#4).

None of these files exist in the repo today (`.env`, `functions/.env`, `google-services.json` and `GoogleService-Info.plist` are all git-ignored). Copy `.env.example` → `.env` and `functions/.env.example` → `functions/.env` and fill them in.

---

## 1. App `.env` (client, public)

Read in `app.config.js` (copied into `expo.extra`) and directly via `process.env` in a few services.

### Firebase web config — **required**

Firebase Console → Project settings → General → *Your apps* → Web app → SDK config.

| Variable | Example | Used in | If missing |
|---|---|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | `AIza…` | `config/firebase.ts` | App can't talk to Firebase at all — sign-in and all data fail |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `newlifejournal-e6826.firebaseapp.com` | same | Sign-in fails (web popup especially) |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `newlifejournal-e6826` | same | Nothing works |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | `newlifejournal-e6826.appspot.com` (or `.firebasestorage.app`) | same | Chat image/PDF attachments and week images fail |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `821548594099` | same | — |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | `1:821548594099:web:…` | same | — |

The Firebase project in `.firebaserc` is **`newlifejournal-e6826`** — the client's project. You need access to it (or your own project; see [Using your own Firebase project](#using-your-own-firebase-project)).

### Google Sign-In — **required for Google login**

Google Cloud Console → APIs & Services → Credentials (same GCP project as Firebase). Firebase auto-creates the Web client when you enable the Google provider.

| Variable | Used in | Notes |
|---|---|---|
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | `services/googleAuth.ts` | **The important one.** Native Google Sign-In uses it to mint the ID token Firebase accepts. |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | `services/googleAuth.ts` | iOS OAuth client for bundle id `com.newlifejournal.app`. |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | `app.config.js` only | Not read by code; Android identifies itself via package name + SHA-1 registered in Firebase. Keep it for completeness. |

Also required outside `.env`:

- `app.json` → `ios.infoPlist.CFBundleURLTypes` hard-codes the **reversed iOS client ID** (`com.googleusercontent.apps.821548594099-…`). If you change the iOS client ID, update this too.
- Android: the **SHA-1 fingerprints** of every signing key (debug keystore, EAS upload key, Play App Signing key) must be added in Firebase → Project settings → Android app. Without them Google Sign-In on Android fails with `DEVELOPER_ERROR`.
- Web: `localhost` (and any hosted domain) must be in Firebase → Authentication → Settings → Authorized domains.

Email/password sign-in needs no env vars — just enable the *Email/Password* provider in Firebase Authentication.

### Legal links — **required for store submission**

Read in `constants/legal.ts`, shown on the sign-in screen, AI consent and Profile.

| Variable | Notes |
|---|---|
| `EXPO_PUBLIC_PRIVACY_URL` | Public privacy-policy page. Apple and Google both reject apps without one. Served from `legal-site/` by Firebase Hosting: `https://newlifejournal-e6826.web.app/privacy` (terms at `/terms`, account deletion at `/delete-account`). |
| `EXPO_PUBLIC_TERMS_URL` | Public terms page. |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | Shown as the contact address. |

If unset the links point nowhere — fine for development, a rejection reason for release.

### RevenueCat (Plus subscription) — optional until monetisation goes live

RevenueCat dashboard → Project settings → API keys → **public** SDK keys (start with `appl_` / `goog_`).

| Variable | Used in | If missing |
|---|---|---|
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | `services/subscriptionService.ts` | Logged warning; everyone is treated as **free**; paywall can't purchase |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | same | same |

RevenueCat is a native module, so purchases also need a dev-client/EAS build (not Expo Go).

### Development only

| Variable | Effect |
|---|---|
| `EXPO_PUBLIC_USE_EMULATOR=1` | Points Auth, Firestore and Functions at local Firebase emulators (`config/firebase.ts`). You then create accounts through the normal sign-up screen. Never set this for a release build. |

The Admin-SDK scripts in `functions/scripts/` (`setPlan.js`, `setModerator.js`, `seedWeekData.js`) read `GOOGLE_APPLICATION_CREDENTIALS` (path to a service-account key, kept outside the repo) and `GCLOUD_PROJECT`, or `FIREBASE_AUTH_EMULATOR_HOST` / `FIRESTORE_EMULATOR_HOST` for the emulator.

---

## 2. Native Firebase files

Needed for the native-only Firebase modules: **Analytics, Crashlytics, Performance** (`@react-native-firebase/*`). Auth, Firestore, Storage and Functions use the JS SDK + `.env` and do **not** need these files.

| File | Get it from | Put it |
|---|---|---|
| `google-services.json` | Firebase → Project settings → Android app `com.newlifejournal.app` | Repo root (local) **or** EAS file env var `GOOGLE_SERVICES_JSON` |
| `GoogleService-Info.plist` | Firebase → Project settings → iOS app `com.newlifejournal.app` | Repo root (local) **or** EAS file env var `GOOGLE_SERVICES_INFO_PLIST` |

`app.config.js` only references a file that actually exists, so a missing file won't break `expo start`. Without them, the monitoring code detects the missing native module and silently does nothing (`services/monitoring/nativeModules.ts`) — the app works, you just get no analytics or crash reports.

---

## 3. `functions/.env` (server, non-secret)

Read by `functions/src/aiChat.ts` via `defineString` / `defineBoolean`. Deployed with the functions.

| Param | Default | Meaning |
|---|---|---|
| `AI_PROVIDER` | `anthropic` | `anthropic` \| `openai` \| `gemini` \| `custom` |
| `AI_MODEL` | provider default (`claude-sonnet-5-5`, `gpt-4o`, `gemini-1.5-pro`) | Model name sent to the provider |
| `CUSTOM_AI_URL` | empty | Base URL when `AI_PROVIDER=custom` (it POSTs to `<url>/chat`) |
| `ENFORCE_APP_CHECK` | `false` | Reject AI calls without a Firebase App Check token. Turn on only after App Check (Play Integrity / App Attest) is configured. |

---

## 4. Cloud Functions secrets (Secret Manager)

Set each once per Firebase project. Requires the project to be on the **Blaze (pay-as-you-go)** plan — Cloud Functions and Secret Manager are not available on the free Spark plan.

```bash
firebase use newlifejournal-e6826
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set CUSTOM_AI_KEY
firebase functions:secrets:set REVENUECAT_SECRET_KEY
firebase functions:secrets:set REVENUECAT_WEBHOOK_SECRET
```

| Secret | Needed when | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | `AI_PROVIDER=anthropic` (default) | console.anthropic.com → API keys |
| `OPENAI_API_KEY` | `AI_PROVIDER=openai` | platform.openai.com |
| `GEMINI_API_KEY` | `AI_PROVIDER=gemini` | aistudio.google.com |
| `CUSTOM_AI_KEY` | `AI_PROVIDER=custom` | your own endpoint |
| `REVENUECAT_SECRET_KEY` | subscriptions | RevenueCat → API keys → **Secret** key (`sk_…`) |
| `REVENUECAT_WEBHOOK_SECRET` | subscriptions | Any random string you choose. Put the same value, as `Bearer <value>`, in RevenueCat → Integrations → Webhooks → Authorization header. |

**All four AI secrets are declared on `aiChat`, so all four must exist in Secret Manager** — `firebase deploy` prompts for (or, non-interactively, fails on) any that are missing. Set the unused ones to a placeholder such as `unused`. Same for both RevenueCat secrets on `syncSubscription` / `revenueCatWebhook`, even before monetisation is live.

---

## EAS builds

`.env` is git-ignored, so EAS's cloud builders never see it. Add every `EXPO_PUBLIC_*` value as an EAS environment variable (expo.dev → project → Environment variables, or `eas env:create`) for the `development`, `preview` and `production` environments, plus the two file variables `GOOGLE_SERVICES_JSON` and `GOOGLE_SERVICES_INFO_PLIST`.

EAS project id (`app.json` → `extra.eas.projectId`): `40995e87-5d67-42d7-ab62-c01cc7227cca` — this belongs to the client's Expo account; you need to be added to it, or replace it with your own (`eas init`).

---

## Minimum to run the app at all

| Goal | You need |
|---|---|
| Run locally against **emulators** (no real project access) | Node 22.13+, Java 21, `.env` with any placeholder Firebase values + `EXPO_PUBLIC_USE_EMULATOR=1` |
| Run against the real project, email sign-in, journal only | The 6 Firebase `EXPO_PUBLIC_FIREBASE_*` values |
| + Google sign-in | + Google client IDs, SHA-1s registered, reversed iOS client ID in `app.json` |
| + AI chat | + Blaze plan, functions deployed, one AI provider key in Secret Manager |
| + Plus subscription | + RevenueCat public keys, RevenueCat secrets, webhook configured, store products |
| + Analytics / crash reports | + `google-services.json` / `GoogleService-Info.plist`, native build |
| Store release | All of the above + real privacy/terms URLs |

---

## Using your own Firebase project

If you can't get access to `newlifejournal-e6826`:

1. Create a Firebase project, upgrade to Blaze, enable Authentication (Google + Email/Password), Firestore, Storage.
2. Register Web, Android (`com.newlifejournal.app`) and iOS (`com.newlifejournal.app`) apps; fill `.env` and download the native files.
3. Change `.firebaserc` → `default` to your project id.
4. Deploy rules, indexes and functions (see [SETUP_AND_DEPLOY.md](SETUP_AND_DEPLOY.md)), set the secrets.
5. Seed the weekly content (`pregnancyWeeks`) — see [SETUP_AND_DEPLOY.md](SETUP_AND_DEPLOY.md#seed-weekly-content).
6. Update the reversed iOS client ID in `app.json`.
