# Handover checklist — access & credentials

Everything the code depends on that is **not in the repository**. Today none of the env files or native Firebase files exist locally, so this is what to request from the client (or recreate under your own accounts).

## Accounts / access to request

| # | What | Why | Owner today |
|---|---|---|---|
| 1 | **Firebase project `newlifejournal-e6826`** — Editor or Owner role | Deploy rules, indexes, functions; read config; set secrets; seed week data | Client |
| 2 | Its **Google Cloud project** (same id) — same role | OAuth client IDs, Secret Manager, billing, service account for admin scripts | Client |
| 3 | Confirmation the project is on the **Blaze** plan + a billing contact | Cloud Functions & Secret Manager don't run on Spark | Client |
| 4 | **Expo account** owning EAS project `40995e87-5d67-42d7-ab62-c01cc7227cca` — add you as a member | EAS builds, EAS environment variables, submissions | Client |
| 5 | **Apple Developer** team access (App Manager) + App Store Connect | iOS builds/signing, TestFlight, submission | Client |
| 6 | **Google Play Console** access | Android release, Play App Signing SHA-1 | Client |
| 7 | **RevenueCat** project access | Public SDK keys, secret key, entitlement `premium`, webhook | Client (may not exist yet) |
| 8 | **AI provider account** (Anthropic by default) or a decision on who pays | API key for `aiChat` | Client decision |
| 9 | GitHub repo `michaelCodeHub/NewLifeJournal` — write access | Push `dev`, PRs, CI | Client |
| 10 | Legal pages: privacy policy URL, terms URL, support email | Required by both stores | Client |
| 11 | Domain / hosting for those pages (if they don't exist) | — | Client |

## Values / files to collect

Once you have access you can pull these yourself; otherwise ask for them.

**For `.env`** (see [ENVIRONMENT.md](ENVIRONMENT.md)):

- [ ] `EXPO_PUBLIC_FIREBASE_API_KEY`
- [ ] `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `EXPO_PUBLIC_FIREBASE_APP_ID`
- [ ] `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- [ ] `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- [ ] `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- [ ] `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_SUPPORT_EMAIL`
- [ ] `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`

**Files:**

- [ ] `google-services.json` (Android app `com.newlifejournal.app`)
- [ ] `GoogleService-Info.plist` (iOS app `com.newlifejournal.app`)
- [ ] A Firebase **service-account JSON** (for `setPlan.js`, `setModerator.js`, `seedWeekData.js`) — keep outside the repo

**Server secrets** (set straight into Secret Manager — don't email them around):

- [ ] AI key for the chosen provider (`ANTHROPIC_API_KEY` by default)
- [ ] `REVENUECAT_SECRET_KEY`
- [ ] `REVENUECAT_WEBHOOK_SECRET` (you choose it)

## Questions to ask the client

1. Is the **weekly content** (`pregnancyWeeks/week1…40`) already in production Firestore, and was it edited there? (`seedWeekData.js` overwrites it with the version in the repo.)
2. Which **rules and functions are currently deployed**? (`dev` changes both — the app from `dev` expects the `dev` backend.)
3. Is there **real user data** in production? If yes, plan the deploy carefully: the new rules reject client writes of `subscription`/`aiUsage`/`devTierOverride` and validate community posts strictly.
4. Who pays for AI usage, and which provider/model? Default is Anthropic `claude-sonnet-5-5`, free tier 15 messages/month.
5. Is Plus going live at launch? Prices/products? (Needs App Store / Play products + RevenueCat.)
6. Who will be **community moderators**?
7. **Baby mode** is now built on `dev` (PRD P0). Confirm the choices made while building: baby features free, ml/oz and kg/cm units, no baby reminders yet (see [V1_RELEASE_PLAN.md](V1_RELEASE_PLAN.md) Phase A).
8. Should `dev` be merged into `main`, or does the client want to review first?

## Before you hand back

- [ ] `dev` pushed, CI green (type check, Jest, rules tests)
- [ ] Backend deployed from `dev` and smoke-tested on a device
- [ ] Docs in `docs/` reviewed with the client
- [ ] Open items from [CHANGES_MAIN_TO_DEV.md](CHANGES_MAIN_TO_DEV.md#open-items-before-release) agreed
