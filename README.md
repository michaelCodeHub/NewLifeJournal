# Bloom & Bump

A private pregnancy journal for iOS and Android, built with Expo / React Native and Firebase. It shows week-by-week growth, tracks visits, symptoms, kicks and contractions, and helps you prepare with a checklist and a birth plan. It also has an AI assistant that answers using the user's own journal, and a moderated community.

After the birth it switches to a baby journal (feeds, diapers, sleep, growth, vaccines) — see [docs/V1_RELEASE_PLAN.md](docs/V1_RELEASE_PLAN.md) for status against the client's v1.0 spec. Plus (subscription) unlocks charts, the birth plan, PDF export, sharing, community, and unlimited AI questions.

## Quick start

```bash
# Node 22.13+ required
npm install
(cd functions && npm install)
cp .env.example .env          # fill in — see docs/ENVIRONMENT.md
npx expo start
```

To develop without touching production, use the Firebase emulators. See [docs/SETUP_AND_DEPLOY.md](docs/SETUP_AND_DEPLOY.md).

## Documentation

| Doc | For |
|---|---|
| [docs/PRODUCT_GUIDE.md](docs/PRODUCT_GUIDE.md) | What the app does, screen by screen (non-technical) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How it works without a custom backend: Firebase, rules, Cloud Functions, data model, known gaps |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | Every env var, secret and config file, and what breaks without each |
| [docs/SETUP_AND_DEPLOY.md](docs/SETUP_AND_DEPLOY.md) | Running, testing, emulators, deploying Firebase, EAS builds and release |
| [docs/HANDOVER_CHECKLIST.md](docs/HANDOVER_CHECKLIST.md) | Access and credentials to collect from the client |
| [docs/V1_RELEASE_PLAN.md](docs/V1_RELEASE_PLAN.md) | Client's v1.0 requirements (PRD) vs `dev`: what's missing, decisions needed, implementation plan |
| [docs/STORE_SUBMISSION.md](docs/STORE_SUBMISSION.md) | Release runbook, store listing copy, privacy-label / data-safety answers, age rating |
| [docs/QA_TEST_PLAN.md](docs/QA_TEST_PLAN.md) | Device QA plan for the launch gate |
| [docs/CHANGES_MAIN_TO_DEV.md](docs/CHANGES_MAIN_TO_DEV.md) | What changed from `main` to `dev`, and the open items before release |
| [components/ui/README.md](components/ui/README.md) | UI kit rules |
| [docs/TESTING_AND_PLANS.md](docs/TESTING_AND_PLANS.md) | Test accounts, giving an account Plus, sandbox purchases, how plans are managed |
| [e2e/PLAN.md](e2e/PLAN.md) | Device end-to-end harness |

Planning documents from earlier phases (kept for history, partly outdated): `PRD_v1.0.md`, `MONETIZATION_PLAN.md`, `Monitoring_Analytics_Plan.md`, `PROGRESS.md`, `NewLifeJournal_TDD_v1.0.docx`.

## Stack

Expo SDK 58 · React Native 0.88 · React 19 · TypeScript · Expo Router · Firebase (Auth, Firestore, Storage, Cloud Functions, Analytics, Crashlytics) · RevenueCat.

## Scripts

| Command | Does |
|---|---|
| `npm start` | Expo dev server |
| `npm run android` / `npm run ios` | Local native build and run |
| `npm run web` | Web |
| `npm test` | Jest unit and UI tests |
| `npm run test:rules` | Firestore rules tests in the emulator (needs Java) |

## License

Private project. All rights reserved.
