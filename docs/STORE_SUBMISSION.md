# Store submission — Phase C

Everything needed to go from `dev` to the App Store and Google Play, in order. Items marked **Client** need the client's accounts or decisions; everything else is ready in the repo.

Related: [SETUP_AND_DEPLOY.md](SETUP_AND_DEPLOY.md) (commands), [ENVIRONMENT.md](ENVIRONMENT.md) (keys), [TESTING_AND_PLANS.md](TESTING_AND_PLANS.md) (test accounts, sandbox), [QA_TEST_PLAN.md](QA_TEST_PLAN.md) (C6).

## Release runbook

| # | Step | Owner | Done when |
|---|---|---|---|
| 1 | Fill the `[PLACEHOLDERS]` in `legal-site/*.html` (company, address, contact, minimum age, effective date, governing law, liability wording, AI provider terms). Have a lawyer review. | Client | `node legal-site/check-placeholders.js` prints "no placeholders left" |
| 2 | Set secrets (AI key, RevenueCat secret + webhook secret) — [ENVIRONMENT.md §4](ENVIRONMENT.md#4-cloud-functions-secrets-secret-manager) | Dev + client access | `firebase functions:secrets:get ANTHROPIC_API_KEY` works |
| 3 | Deploy backend + legal pages: `npx firebase deploy --only firestore:rules,firestore:indexes,storage,functions,hosting` | Dev | Deploy succeeds; https://newlifejournal-e6826.web.app/privacy loads. Say **yes** when asked to delete the old `devSetTier` function |
| 4 | Seed week content for the AI: `cd functions && node scripts/seedWeekData.js` | Dev | "Wrote 40 pregnancyWeeks documents" |
| 5 | RevenueCat: products in App Store Connect + Play Console, attached to entitlement `premium`, in the *current* offering; webhook → `revenueCatWebhook` URL | Client + dev | Sandbox purchase unlocks Plus ([TESTING_AND_PLANS.md §4](TESTING_AND_PLANS.md#4-testing-real-purchases-store-sandbox)) |
| 6 | EAS environment variables for `production` (all `EXPO_PUBLIC_*`, incl. the two legal URLs and support email) + `GOOGLE_SERVICES_JSON` / `GOOGLE_SERVICES_INFO_PLIST` files | Dev | `eas env:list --environment production` shows them |
| 7 | Release SHA-1 (Play App Signing) added to the Firebase Android app | Dev + client | Google Sign-In works in an internal-testing build |
| 8 | `eas build --profile production --platform all` | Dev | Builds succeed (needs a native build: Expo 58, new native modules) |
| 9 | QA gate on devices — [QA_TEST_PLAN.md](QA_TEST_PLAN.md) | QA | All P0 cases pass |
| 10 | Reviewer account: create `review@…`, give it Plus with `node functions/scripts/setPlan.js review@… plus`, add a pregnancy near week 30 with a few entries | Dev | Reviewer can see every feature without paying |
| 11 | Store listings (below), screenshots, privacy answers, age rating | Client + dev | Forms complete |
| 12 | `eas submit -p ios` / `-p android` → TestFlight / internal testing → production | Dev | Approved |

---

## Store listing copy (C4)

Lengths are checked against store limits. The client should approve the wording.

### App Store

| Field | Limit | Text |
|---|---|---|
| Name | 30 | Bloom & Bump: Pregnancy & Baby |
| Subtitle | 30 | Private pregnancy & baby diary |
| Promotional text | 170 | Week-by-week baby updates, an AI companion that knows your journey, and one private journal from bump to baby. Never sold, never shared. |
| Keywords | 100 | pregnancy,tracker,baby,kick counter,contraction timer,due date,newborn,feeding,diary,journal,birth |
| Primary category | | Health & Fitness |
| Secondary category | | Medical |
| Support URL | | https://newlifejournal-e6826.web.app |
| Privacy policy URL | | https://newlifejournal-e6826.web.app/privacy |

### Google Play

| Field | Limit | Text |
|---|---|---|
| App name | 30 | Bloom & Bump: Pregnancy & Baby |
| Short description | 80 | Private pregnancy & baby journal with week-by-week updates and an AI companion. |
| Category | | Health & Fitness (or Parenting) |
| Privacy policy | | https://newlifejournal-e6826.web.app/privacy |
| Account deletion URL | | https://newlifejournal-e6826.web.app/delete-account |

### Full description (both stores, ≤ 4000)

```
Bloom & Bump is one private journal for your whole journey — from your first scan to your baby's first months.

YOUR PREGNANCY, WEEK BY WEEK
• See how big your baby is this week, what's developing and what's changing for you
• Log symptoms, hospital visits, weight and blood pressure, and special milestones
• Everything in one timeline, grouped by week

TOOLS FOR THE LAST WEEKS
• Kick counter with a 7-day chart
• Contraction timer with the 5-1-1 alert and a summary you can share with your midwife
• Hospital bag and baby checklist
• Birth plan builder (Plus)

WHEN YOUR BABY ARRIVES
• Tap "Baby has arrived" and your journal becomes your baby's journal
• Log feeds (breast, bottle, solids), diapers and sleep in seconds — timers keep running even if you close the app
• Track growth and vaccines
• Your pregnancy journal stays safe under "Before you were born"

AN AI COMPANION THAT KNOWS YOUR JOURNEY
• Ask questions any time and get answers that take your week, or your baby's age, into account
• Urgent warning signs always get a clear "call for help now" message
• Not a replacement for your doctor or midwife

PRIVATE BY DESIGN
• Only you can see your journal
• We never sell your data or use it for ads
• Usage and crash reports are off unless you turn them on
• Delete your account and everything in it, any time, from inside the app

BLOOM & BUMP PLUS
Unlimited AI answers, weight and blood pressure charts, the birth plan builder, PDF reports for your care team, timeline sharing and the community. Free accounts include 15 AI questions a month.

Bloom & Bump provides general information and is not a medical device. Always contact your doctor, midwife or local emergency number if you are worried about your health or your baby's.
```

Subscription disclosure for the App Store description (Apple requires it for auto-renewing subscriptions):

```
Plus is an auto-renewing subscription. Payment is charged to your Apple ID at confirmation. It renews automatically unless cancelled at least 24 hours before the end of the current period; manage or cancel in your Apple ID account settings. Terms: https://newlifejournal-e6826.web.app/terms · Privacy: https://newlifejournal-e6826.web.app/privacy
```

### Screenshots

Required sizes:

- **iPhone 6.9″:** 1320×2868. Apple accepts it in place of the 6.5″ set.
- **iPhone 6.5″:** 1284×2778.
- **iPad 13″:** 2064×2752. Needed because `supportsTablet` is true; or set `supportsTablet: false` to skip it (client decision).
- **Play:** phone screenshots, 1080×1920 or larger, plus a 1024×500 feature graphic.

Take them on a simulator or device, signed in with the reviewer account, in light mode:

1. **Home:** the week card, around week 24.
2. **Timeline:** a few weeks of entries.
3. **Ask:** one question and a personalised answer.
4. **Kick counter:** the 7-day chart.
5. **Contraction timer:** mid-session.
6. **Baby Home:** today's totals and a running sleep timer.
7. **Baby Timeline:** day summaries.
8. **Growth chart.**

Overlay captions (optional):

- "Your baby, week by week"
- "Everything in one timeline"
- "Answers that know your journey"
- "Ready for the big day"
- "From bump to baby"
- "Private by design"

### App Review notes (App Store Connect → App Review Information)

```
Demo account: review@[domain] / [password] — has Plus enabled, so every feature is available without a purchase.

Bloom & Bump is a pregnancy and baby journal. It is not a medical device and makes no diagnostic claims; the AI assistant shows a consent screen before first use, states it is not a doctor, and always prefixes answers to emergency symptoms with advice to contact emergency services or a maternity unit.

Account deletion: You tab → Delete account (type DELETE). Purchases: You → See plans, or any Plus feature. Restore purchases is on the paywall.
```

---

## Privacy answers (C5)

These were derived from the code: what the app writes to Firebase, what it sends to the AI provider, and the RevenueCat and opt-in monitoring SDKs. They match `app.json → ios.privacyManifests`, the privacy policy and the delete-account page. Re-check them if any of those change.

### App Store "App Privacy"

**Tracking:** No. There's no ad SDK and no data shared with data brokers, and the app never uses the ad identifier.

| Data type | Collected | Linked to user | Used for tracking | Purposes |
|---|---|---|---|---|
| Health & Fitness → Health | Yes (pregnancy & baby journal) | Yes | No | App Functionality |
| Contact Info → Email Address | Yes | Yes | No | App Functionality |
| Contact Info → Name | Yes | Yes | No | App Functionality |
| User Content → Photos or Videos | Yes (chat attachments) | Yes | No | App Functionality |
| User Content → Other User Content | Yes (notes, AI questions, community posts) | Yes | No | App Functionality |
| Identifiers → User ID | Yes (account id) | Yes | No | App Functionality |
| Purchases → Purchase History | Yes (Plus status) | Yes | No | App Functionality |
| Usage Data → Product Interaction | Yes, only if the user opts in | **No** | No | Analytics |
| Diagnostics → Crash Data | Yes, only if the user opts in | **No** | No | App Functionality |
| Diagnostics → Performance Data | Yes, only if the user opts in | **No** | No | App Functionality |

Apple counts optional collection as collected, which is why the opt-in rows say "Yes".

### Google Play "Data safety"

- **Data collected:** Yes.
- **Data shared:** No. Transfers to service providers (Firebase, the AI provider, RevenueCat) aren't "sharing" under Play's definition.
- **Encrypted in transit:** Yes.
- **Users can request deletion:** Yes, in the app and at https://newlifejournal-e6826.web.app/delete-account.

| Category → type | Collected | Optional? | Purpose |
|---|---|---|---|
| Personal info → Name, Email address, User IDs | Yes | Required | Account management, App functionality |
| Health and fitness → Health info | Yes | Required (to use the journal) | App functionality, Personalization |
| Photos and videos → Photos | Yes | Optional (chat attachments) | App functionality |
| Messages → Other in-app messages | Yes (AI chat, community) | Optional | App functionality |
| Files and docs | Yes (PDF attachments) | Optional | App functionality |
| Financial info → Purchase history | Yes | Optional (Plus) | App functionality |
| App activity → App interactions | Yes | Optional (opt-in) | Analytics |
| App info and performance → Crash logs, Diagnostics | Yes | Optional (opt-in) | App functionality |

The app does not collect location, contacts, calendar, audio or device advertising IDs.

### Age rating

- **Apple age rating questionnaire:**
  - Medical/Treatment Information: **Infrequent/Mild** (general pregnancy information and an AI assistant, not treatment).
  - User-Generated Content: **Yes**. The community has reporting, blocking and moderation.
  - Everything else: None.
  - Expected rating: **12+**, or **17+** if Apple treats unrestricted user content strictly.
- **Play (IARC):**
  - The community is user-to-user interaction.
  - No violence or sexual content.
  - Expected rating: Teen / PEGI 12.
- **Health apps:** Apple may ask for proof of medical review of the week-by-week content. Keep the content's sources at hand, or describe it as general information (as the listing does).

## Dependency audit

`npm audit` (Nov 2026) reports advisories almost entirely in build and test tooling: Expo CLI, Metro and Jest. Test tooling (`jest-expo`, `test-renderer`, `@react-native/jest-preset`) is in `devDependencies`, so `--omit=dev` leaves it out.

The one in the app's runtime path is `@grpc/grpc-js` under the Firebase JS SDK. React Native builds talk to Firestore over WebChannel, not gRPC, so it doesn't run on phones.

Before release:

- Update to the newest `firebase` 12.x.
- ~~Move `jest-expo`, `test-renderer` and `@react-native/jest-preset` to `devDependencies`~~ (done).
- Re-run `npm audit --omit=dev`.

Don't use `npm audit fix --force`: it downgrades Expo packages and breaks the SDK 58 alignment that `expo-doctor` checks.

## Decisions still open for the client

- Minimum age: 16 or 18? It goes in the legal pages and the store age rating.
- Should the app support iPad? If not, set `ios.supportsTablet: false`; the iPad screenshot set and iPad QA then aren't needed.
- Category: Medical as the secondary category, and Parenting vs Health & Fitness on Play.
- Which AI provider, and does it retain or train on the data? This decides the wording in the privacy policy, section 4.
- Moderation report retention period.
