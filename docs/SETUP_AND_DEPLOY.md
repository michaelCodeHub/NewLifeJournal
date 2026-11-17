# Setup, run, test & deploy

For what each variable means see [ENVIRONMENT.md](ENVIRONMENT.md). For how the pieces fit see [ARCHITECTURE.md](ARCHITECTURE.md).

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | **22.13+** (Expo SDK 58) | app and Cloud Functions (`functions/` targets Node 22) |
| npm | comes with Node | |
| Java | 21 (Temurin) | Firebase emulators, `npm run test:rules` |
| Firebase CLI | installed as a dev dependency (`npx firebase …`) | deploy rules/functions, emulators |
| EAS CLI | `npm i -g eas-cli` (≥ 20) | cloud builds & store submission |
| Android Studio / Xcode | latest | only for local native builds / simulators |

Access you need (from the client, or replace with your own — see [HANDOVER_CHECKLIST.md](HANDOVER_CHECKLIST.md)): Firebase project `newlifejournal-e6826`, its Google Cloud project, the Expo account that owns EAS project `40995e87-…`, the RevenueCat project, Apple Developer and Google Play Console.

## 1. Install

```bash
npm install
cd functions && npm install && cd ..
cp .env.example .env               # then fill in
cp functions/.env.example functions/.env
```

## 2. Run locally against the emulators (no production access needed)

Safest way to work — nothing touches real user data.

```bash
# terminal 1 — emulators (Auth 9099, Firestore 8080, Storage 9199, Functions 5001, UI 4000)
cd functions && npm run build && cd ..
npx firebase emulators:start --project newlifejournal-e6826

# terminal 2 — app
EXPO_PUBLIC_USE_EMULATOR=1 npx expo start --web -c
```

On Windows PowerShell: `$env:EXPO_PUBLIC_USE_EMULATOR='1'; npx expo start --web -c`.

Create accounts through the app's normal **Create account** screen. The emulator UI at http://localhost:4000 lets you inspect and edit data. For test accounts, giving one Plus, and keeping emulator data between runs, see [TESTING_AND_PLANS.md](TESTING_AND_PLANS.md).

AI chat against the emulator needs a real provider key: put e.g. `ANTHROPIC_API_KEY=…` in `functions/.secret.local` (the emulator reads secrets from it; it's listed in `functions/.gitignore` — never commit it).

## 3. Run on a phone

The app uses native modules (Google Sign-In, RevenueCat, Firebase Analytics/Crashlytics/Perf), so **Expo Go is not enough** for the full app. Use a development build:

```bash
# local build (needs Android Studio / Xcode)
npm run android        # = expo run:android
npm run ios            # = expo run:ios (macOS only)

# or a cloud build, then install the result on the device
eas build --profile development --platform android
npx expo start --dev-client
```

Native modules that are missing are detected at runtime and skipped, so the journal itself still works in limited environments (web, Expo Go) — you just lose Google native sign-in, purchases and monitoring there.

## 4. Tests

```bash
npx tsc --noEmit -p .   # type check
npm test                # unit + UI tests (Jest)
npm run test:rules      # Firestore rules tests in the emulator (needs Java)
```

CI (`.github/workflows/ci.yml`) runs all three on every push/PR to `main` and `dev`.

There is also a Python/ADB end-to-end harness in `e2e/` (see `e2e/PLAN.md`).

## 5. Deploy the backend (Firebase)

Requires the **Blaze** plan and owner/editor access to the project.

```bash
npx firebase login
npx firebase use newlifejournal-e6826

# one-time: secrets (see ENVIRONMENT.md §4)
npx firebase functions:secrets:set ANTHROPIC_API_KEY
# …and the other five (placeholders are fine for unused providers)

# rules + indexes + storage rules + functions
npx firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```

**The `dev` branch changes rules, indexes and functions — none of it is live until this deploy runs.** Deploy the backend *before* releasing an app build from `dev`; the new app relies on `deleteAccount`, the hardened `aiChat`, the new rules for reports/blocks, and the collection-group indexes for account deletion.

After deploying:

- **RevenueCat webhook:** copy the `revenueCatWebhook` URL from the deploy output into RevenueCat → Integrations → Webhooks, with `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`.
- **Moderators:** `cd functions && GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json node scripts/setModerator.js someone@example.com`
- **Plus for test/comped accounts:** `node scripts/setPlan.js <email> plus` (see [TESTING_AND_PLANS.md](TESTING_AND_PLANS.md)).

### Seed weekly content

The week-by-week content lives in `constants/pregnancyWeeks.ts` and ships with the app, so Home works with an empty database. Firestore `pregnancyWeeks/week1 … week40` overrides it (so content can be corrected without a release) and is what the `aiChat` function reads for the AI's "this week" context — so seed it once per project, and again whenever you edit the file.

Clients can't write that collection (the rules deny it), so the script uses the Admin SDK:

```bash
cd functions
node scripts/seedWeekData.js --dry-run       # list what would be written
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json GCLOUD_PROJECT=newlifejournal-e6826 node scripts/seedWeekData.js

# local emulator
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=newlifejournal-e6826 node scripts/seedWeekData.js
```

It overwrites all 40 documents.

## 6. Build & release the app (EAS)

```bash
eas login
eas env:create   # add every EXPO_PUBLIC_* value + GOOGLE_SERVICES_JSON / GOOGLE_SERVICES_INFO_PLIST file vars
eas build --profile preview --platform android      # internal test APK/AAB
eas build --profile production --platform all       # store builds (build number auto-increments)
eas submit --platform ios
eas submit --platform android
```

Profiles (`eas.json`): `development` (dev client, internal), `preview` (internal), `production` (store, `autoIncrement`, app version from EAS remote).

Identifiers: iOS bundle id and Android package are both `com.newlifejournal.app`; URL scheme `newlifejournal`.

Before submitting:

- [ ] Real `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_SUPPORT_EMAIL`
- [ ] Backend deployed from the same branch
- [ ] `functions/scripts/seedWeekData.js` run against production
- [ ] Release SHA-1 (Play App Signing) added to Firebase for Google Sign-In
- [ ] Store products created and attached to the `premium` entitlement in RevenueCat
- [ ] App privacy questionnaires (App Store "nutrition label", Play Data safety) match `app.json` → `ios.privacyManifests` (health, email, name, user id, user content, photos, purchases; crash and interaction data unlinked)
- [ ] Tested on a real Android and iOS device
