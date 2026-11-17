# Changes from `main` to `dev`

- **`main`** (tip `d70000c`, 6 Aug 2026): the client's code.
- **`dev`** (tip `6ee986e`): `main` plus two commits from the launch-readiness work.

| Commit | Date | Scope |
|---|---|---|
| **A** `461b17b` "launch-readiness audit, UI kit overhaul, and startup/UI polish" | 10 Nov 2026 | Most of the work: security, backend, the Expo 58 upgrade, the redesign and new navigation, privacy, CI and tests |
| **B** `6ee986e` "edit details and entries, baby has arrived, clear chat, new sign-in screen" | 11 Nov 2026 | Editing, the "Baby has arrived" flow, Clear chat, and a new sign-in screen |

The history is linear, so `dev` can be fast-forward merged into `main`. In total 162 files changed. About 25k of the changed lines are `package-lock.json`; the rest are mostly screens rewritten on the new UI kit.

---

## Summary for the client (non-technical)

- **New for users:** edit pregnancy details and past entries; mark "Baby has arrived"; clear chat history; delete account; report and block in Community; dark mode; repeating reminders; a redesigned sign-in screen; a Tools tab that lists every feature.
- **Safer:** AI keys never ship in the app. The AI's safety instructions are fixed on the server. Urgent-symptom messages always get an "call your maternity unit" notice. Usage limits protect the AI bill. Nobody can give themselves Plus or fake community data.
- **Store-ready:** account deletion, privacy-policy and terms links, opt-in analytics, an AI consent screen, and the iOS privacy manifest, all of which Apple and Google require.
- **Faster and lighter:** growth images went from 6.7 MB to 0.7 MB, startup is smoother, and screens no longer reload when data changes.
- **Fixed:** community posting was broken on `main`. Chat attachments could not be downloaded. Users were logged out between sessions, and returning users could be sent back to onboarding.

---

## 1. New features

| Feature | Commit | Where |
|---|---|---|
| **Edit pregnancy details** (name, due date, baby's name, hospital, doctor, phone). Changing the due date moves every visit, symptom and milestone to the correct week. | B | `app/(pregnancy)/editpregnancy.tsx`, `pregnancyService.updatePregnancyDetails` / `recalculateEntryWeeks` |
| **Edit visits, symptoms and milestones**: tap a card, or use Timeline → Edit entry | B | `visits.tsx`, `symptoms.tsx`, `(tabs)/timeline.tsx`, `components/MilestoneSheet.tsx` |
| **Baby has arrived**: records the birth date, marks the pregnancy completed, freezes the week count and keeps the journal readable. It can be undone from Profile, and a new pregnancy can be started. | B | `components/BabyArrivedSheet.tsx`, `pregnancyService.completePregnancy` / `reopenPregnancy`, `lib/journal.ts` |
| **Clear chat history**: deletes the messages and their photos. It does not reset the free AI allowance. | B | `chatbotService.clearChatHistory`, `(tabs)/chat.tsx` |
| **New sign-in screen**: Google first, show/hide password, inline password reset, Terms and Privacy links | B | `app/(auth)/login.tsx` |
| **Delete account**: removes all data, files and the login on the server | A | `functions/src/deleteAccount.ts`, `services/firebase/accountService.ts` |
| **Community safety**: report posts and comments, block users, a Blocked accounts screen with Unblock | A | `components/community/*`, `app/(pregnancy)/blocked.tsx` |
| **Moderator queue**: Profile → Moderation, only for accounts with the `moderator` or `admin` claim | A | `app/(pregnancy)/moderation.tsx`, `functions/scripts/setModerator.js` |
| **AI consent screen** before the first question | A | `components/chat/AiConsent.tsx` |
| **Analytics opt-in** (off by default) | A | `services/monitoring/consent.ts` |
| **Privacy, Terms and Support links** (hidden until the URLs are set) | A | `constants/legal.ts` |
| **Dark mode** with a System, Light or Dark setting | A | `context/ThemeContext.tsx` |
| **Tools tab**: every feature grouped as Track, Prepare or Share, with Plus features marked | A | `app/(pregnancy)/(tabs)/tools.tsx` |
| Add and delete milestones from Timeline | A | `MilestoneSheet.tsx` |
| Custom symptom and visit labels, with an icon for each symptom | A | `types/pregnancy.ts` (`label`), `lib/journal.ts` |
| Repeating reminders: weekly (Sunday 9am) and daily kick reminder (8pm) | A | `services/notificationService.ts` |
| Plus previews: free users see a faded sample behind the upsell | A | `components/PremiumPreview.tsx` |
| Emergency notice on red-flag AI questions | A | `functions/src/aiChat.ts` |
| Birth plan auto-saves | A | `birthplan.tsx` |
| Smooth splash screen, Inter font, centred 480px column on desktop web | A | `app/_layout.tsx` |

## 2. Redesign and navigation (A)

- **Navigation:**
  - **`main`:** one tab navigator with 17 routes. A custom tab bar reordered the top 4 tabs by pregnancy stage and put the rest in a "More" sheet.
  - **`dev`:** a stack (Paywall opens as a modal) around **5 fixed tabs: Home · Timeline · Tools · Ask · You** (`components/TabBar.tsx`).
- **Moved screens:** `home`, `chat`, `timeline` and `profile` moved into `app/(pregnancy)/(tabs)/`. Their routes changed, for example `/(pregnancy)/home` became `/(pregnancy)/(tabs)/home`.
- **New UI kit:** `components/ui/` holds Screen, Sheet, Button, Fields, Calendar, Choice, Toast, ConfirmSheet, Icon and more, with rules in `components/ui/README.md`. Every screen was rebuilt on it. Feature components were split into `components/{chat,community,insights,prep,timers}/`.
- **Colours:**
  - Primary: `#81bec1` → `#3AA3A9` (the logo teal).
  - Light background: → `#FFFFFF`.
  - Dark background: `#0B1011`.
- **Routing:** a single `AuthGate` in `app/_layout.tsx` sends each user to sign-in, onboarding or home. `app/index.tsx` is now just the brand splash.
- **Baby mode switched off** for v1 (`constants/features.ts` `BABY_MODE_ENABLED = false`). New users go straight to pregnancy setup. Baby mode was only a "coming soon" placeholder on `main`.

## 3. Removed

| Removed | Replaced by |
|---|---|
| `app/(pregnancy)/{home,chat,timeline,profile}.tsx` | `(tabs)/` versions |
| `components/CustomTabBar.tsx` (stage-based tab order, "More" sheet) | `TabBar.tsx` + Tools tab |
| `components/ScreenHeader.tsx`, `constants/icons.ts` | `components/ui/Screen.tsx`, `components/ui/Icon.tsx` |
| `app/(baby)/home.tsx` | `app/(baby)/baby.tsx` (coming soon) |
| `@react-native-community/datetimepicker` | `components/ui/Calendar.tsx` |
| AI model settings in `app.json` `extra` | Server-only (`functions/.env`) |
| Health data in analytics events (week, symptom type, severity, counts, error text) | Removed deliberately for privacy |
| PNG growth images, `assets/logo.png` | WebP images, `assets/brand/*` |

No working feature from `main` was lost. The only behaviour dropped on purpose is the stage-based tab reordering.

## 4. Security & backend (A)

**`firestore.rules`**
- `users/{uid}`:
  - The client may only write `email, name, picture, currentMode, lastLogin, createdAt`.
  - Subscription, AI usage and tier override are server-only.
- `users/{uid}/private/*`: server-only. It holds the AI rate limits.
- `users/{uid}/blocked/*`: owner only, with a validated shape.
- Community posts and comments are validated:
  - exact fields
  - author = caller
  - length limits (2000 / 1000)
  - week 1–42
  - counters start at 0 and move ±1 only
  - timestamps must be server time
- `reports`:
  - Anyone can create one, but no one can read their own back.
  - Moderators can read reports and close them.
  - Nobody can delete one.
- `isModerator()`: the `moderator` or `admin` claim. Moderators can delete any post or comment.

**`storage.rules`**
- Fixed chat-attachment reads: the old rule broke every `getDownloadURL`.
- PDFs are now capped at 10 MB, like images.

**`firestore.indexes.json`**: collection-group indexes on `comments.userId` and `likes.userId`, which `deleteAccount` needs.

**`firebase.json`**
- Emulators listen on `0.0.0.0`, so a phone on the LAN can reach them.
- Native analytics auto-collection is off until the user consents.

**Cloud Functions**
- `aiChat`:
  - Builds the system prompt on the server (`systemPrompt.ts`) and ignores any client prompt or settings.
  - Validates input: 20 turns, 4k characters per message, 24k total, 3 images.
  - Limits: 6 per minute and 150 per day for everyone, and 15 per month for free users (resets at the start of the UTC month).
  - Adds an emergency notice when a message matches a red flag.
  - Supports App Check (optional).
  - Hides provider errors from the client.
  - Default model: `claude-sonnet-5-5`.
- `tier.ts`: an expired Plus mirror counts as free.
- `subscription.ts`: expired RevenueCat entitlements resolve to free; adds the `cancelled` status; accounts for billing issues.
- `deleteAccount` (new).
- `setModerator.js` (new script).
- Runtime: Node 20 → 22.

**Client hardening**
- HTML is escaped in the PDF export and the shared timeline.
- Community writes use server timestamps.
- Posts are created with a single `setDoc`. The old add-then-update pattern was rejected by the rules, so **posting was broken on `main`**.

## 5. Platform & build (A)

| Package | `main` | `dev` |
|---|---|---|
| Expo SDK | 54.0.33 | **58.0.23** |
| React Native | 0.81.5 | **0.88.1** |
| React | 19.1 | 19.3 |
| Expo Router | 6.0.23 | 58.0.30 |
| TypeScript | 5.9 | 6.0 |
| Jest / jest-expo | 29.7 / 54 | 30.5 / 58 |
| firebase (JS) | 12.x | unchanged |
| @react-native-firebase | 25.1 | unchanged |
| react-native-purchases | 8.12 | unchanged |
| reanimated / gesture-handler | — | 4.7 / 3.3 (new) |

- **Node 22.13+ is required.**
- New packages: expo-image, expo-haptics, expo-splash-screen, expo-font, expo-asset, Inter fonts.
- `app.json`:
  - automatic light/dark
  - full iOS privacy manifest
  - splash plugin with a dark variant
  - new icons
  - microphone permission off
- `app.config.js`:
  - Native Google services files are used only if they exist.
  - EAS file variable `GOOGLE_SERVICES_JSON` added.
  - Legal URLs added.
- `.env.example`: adds `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_SUPPORT_EMAIL`.
- `functions/.env.example`: adds `ENFORCE_APP_CHECK`; the model is now `claude-sonnet-5-5`.
- **CI** (`.github/workflows/ci.yml`, new): type check, Jest and rules tests on every push and PR to `main` or `dev`.

## 6. Privacy & compliance (A)

- **Analytics:**
  - Opt-in, stored on the device (`bb.consent.v1`).
  - A parameter allowlist means no health data is sent.
  - Native auto-collection is off.
- AI consent screen, server-side safety rules, and emergency escalation.
- Account deletion that meets App Store 5.1.1(v) and Google Play requirements.
- Legal links, the iOS privacy manifest, and tighter permissions.

## 7. Performance (A)

- **Images:** growth images are 512px WebP (6.7 MB → 0.7 MB) and render through `expo-image`.
- **Offline cache:** persistent on web, in memory on native.
- **Week info:** cached per session.
- **Rendering:**
  - Memoized contexts.
  - Listeners are keyed by pregnancy id, so a write no longer rebuilds every listener.
  - Memoized timeline rows.
  - Animations run on reanimated.
- **Errors:** listeners now have error callbacks, so screens show an error instead of spinning forever.

## 8. Tests

- New `rules-tests/firestore.rules.test.ts`: 33 rules tests (A).
- New `__tests__/unit/journalEditing.test.ts` (B).
- Updated tests for community, home, notifications and theme (contrast checks).
- PROGRESS.md reports 255 unit tests and 33 rules tests passing.
- **Not covered:** Cloud Functions have no tests. The `e2e/` flows still describe the old UI (FAB, coloured left borders) and need updating.

---

## Fixed after the analysis (uncommitted, on `dev`)

| Issue | Fix |
|---|---|
| AI never saw "this week" content (`pregnancyWeeks/12` vs `week12`) | `functions/src/systemPrompt.ts` reads `week{N}` (`weekDocId`) |
| AI lost all personal context after "Baby has arrived" | Server picks the active pregnancy, else the latest completed one (same rule as the app). Prompt switches to a postpartum tone with the birth date. |
| AI "upcoming appointments" always empty | Now built from visits' `nextVisitDate` |
| Weekly content couldn't be seeded (in-app button blocked by rules) | Content moved to `constants/pregnancyWeeks.ts`. The app falls back to it when Firestore has no document or is offline. New Admin-SDK script `functions/scripts/seedWeekData.js` writes it for the AI. |
| Dead "Week images" uploader (blocked by storage rules, never displayed) | Removed, together with `uploadWeekImage` / `getWeekImageUrl` |
| Test logins and dummy data in the app | Removed: the emulator "Dev test login" (hard-coded `devtest@…` credentials) from the sign-in screen, the Developer tools screen (`admin.tsx`: dummy data, hard-coded `test@newlifejournal.app` account, tier buttons), the `devSetTier` Cloud Function, `scripts/addDummyData.ts`, `scripts/seedTestUser.mjs`, `drive.js` + `docs/WEB_TESTING.md` and the Playwright dependency. Testing is now done with real sign-ups; see [TESTING_AND_PLANS.md](TESTING_AND_PLANS.md). |
| No way to give a tester or reviewer Plus once the tools were gone | New `functions/scripts/setPlan.js <email> plus\|free\|clear` (Admin SDK; writes the server-only `devTierOverride`) |
| "Check your email" screen after sign-up was misleading (the user is already signed in and moves on to onboarding) | Replaced with a toast; the verification email is still sent |
| Reminders only scheduled while the Reminders screen was open; deleted visits kept their reminders | `syncReminders` moved into `services/notificationService.ts` and run by `hooks/useReminderSync.ts` (mounted in the pregnancy layout) whenever visits or the pregnancy change. Clears every app-owned reminder before rescheduling; stops after the birth; uses the visit's own title. |
| Reminders kept firing after sign-out or account deletion | `signOut` cancels all scheduled notifications |
| "Coming up" showed "Unknown" for repeating reminders | Shows "Every day at 8:00 PM" / "Sundays at 9:00 AM" |
| PDF report showed categories ("Test", "other") instead of the user's labels | Uses `visitTitle` / `symptomTitle` |
| Paywall had no Terms or Privacy links | Added (shown when the URLs are configured) |
| Startup log printed part of the Firebase API key | Replaced with a warning only when config is missing |
| "Upgrade to Premium" copy, photo-permission grammar | "Plus"; tidied wording |
| `functions/.secret.local` could be committed | Added to `functions/.gitignore` |

Tests: type check clean. Jest: 274 passing (new: `weekInfo.test.ts`, `syncReminders` cases). The `journalEditing` suite now loads; before, it failed to start in Jest. Functions build passes. Rules unchanged.

## Phase A: baby mode (uncommitted, on `dev`)

Built to the client's PRD (F04, F06, F07, F16–F24). Details and file list: [V1_RELEASE_PLAN.md](V1_RELEASE_PLAN.md#phase-a-baby-mode-p0--built-on-dev-17-nov-2026-not-yet-device-tested).

- **Onboarding:** choose-mode offers *My baby* and leads to a real baby setup form.
- **Baby has arrived:** a celebration screen (shown from week 37) creates the baby linked to the pregnancy, switches to baby mode, and keeps the pregnancy journal under "Before you were born".
- **Baby tabs:**
  - **Home:** age and day of life, today's totals, running timers, quick log.
  - **Timeline:** grouped by day, with filters.
  - **Tools:** growth chart, health & vaccines, Community.
  - **Ask:** the shared chat screen.
  - **You:** babies, switching modes, edit or remove a baby.
- **Logging sheets:**
  - **Feed:** breast/bottle/solids, ml/oz, live timer or past feed.
  - **Diaper:** wet/dirty/both plus colour.
  - **Sleep:** live timer or past nap.
  - **Growth** and **Health**.
  - Timers are stored in Firestore, so they survive restarts.
- **AI:**
  - Conversations live under the baby in baby mode.
  - The server builds the baby's context.
  - Newborn emergency rules and red flags are added.
- **Cleanup:**
  - Removed `components/BabyArrivedSheet.tsx`, `app/(baby)/baby.tsx` and `markBabyArrived`.
  - The two profiles now share `components/profile/ProfileParts.tsx`.
  - New `components/ui/DateTimeField.tsx`.
  - "Undo baby has arrived" also clears `transitionedToBabyId`.
- **Tests:** 292 Jest tests pass (new: `babyJournal`, `babyService`). Rules tests cover `babies/**`. The functions build passes. The web bundle builds. **Not yet run on a device or against the emulator.**

## Phase B: partial requirements (uncommitted, on `dev`)

Details: [V1_RELEASE_PLAN.md](V1_RELEASE_PLAN.md) Phase B.

- **Profile:** Past pregnancies, both modes.
- **Delete account:** type DELETE to confirm, then a success screen.
- **Kick counter:** Home shortcut from week 20, first-movement time, 7-day chart, low-count note, session survives restarts.
- **Contraction timer:** the 5-1-1 rule now requires a full hour, plus Share summary and a session that survives restarts.
- **AI suggestions:** dynamic (this week's development, latest symptom).
- **Weekly notifications:** "You're now week N" with the baby's size.
- **Privacy:** crash reports are opt-in, and ad personalisation is off.
- **Offline banner:** under every header.
- **Analytics:** every PRD event is now tracked.
- **Rating prompt:** 3 days after the first log.
- **Drafts:** a new visit, symptom or feed is restored if the app is closed mid-entry.
- **Tests:** 304 Jest tests pass. The web bundle builds. Not yet run on a device.

## Phase C: launch readiness (uncommitted, on `dev`)

- **OS minimums:** iOS 16.4 and Android SDK 26 pinned (`expo-build-properties`).
- **Expo packages:** updated to the SDK 58 patch versions; `expo-doctor` passes all 20 checks.
- **Legal pages:** `legal-site/` (privacy, terms, account deletion, landing), served by Firebase Hosting. The deploy is guarded until the placeholders are filled.
- **Privacy:** analytics no longer attaches the user id ("anonymous usage" is now accurate), and performance data is declared in the iOS privacy manifest.
- **New docs:** [STORE_SUBMISSION.md](STORE_SUBMISSION.md) (runbook, listing copy, privacy answers) and [QA_TEST_PLAN.md](QA_TEST_PLAN.md).

## Open items before release

**Must do**

1. **Deploy the backend from `dev`** (rules, indexes, storage, functions) *before* shipping the app. The new app depends on it: the old `aiChat` would receive no instructions, and blocks and reports would be rejected.
2. **New native build required.** The SDK 54→58 and RN 0.81→0.88 upgrade can't ship as an over-the-air update. **Nothing has run on a real device yet.** Confirm `react-native-purchases` 8.12 and `@react-native-firebase` 25.1 work on RN 0.88.
3. ~~Fix the AI week-content bug~~ (fixed, see above).
4. **Run `functions/scripts/seedWeekData.js`** against production so the AI gets weekly context (see [SETUP_AND_DEPLOY.md](SETUP_AND_DEPLOY.md#seed-weekly-content)).
5. **Real privacy, terms and support values.**
6. **Check the AI model ID** `claude-sonnet-5-5` is enabled on the account, or set `AI_MODEL`.
7. **Grant at least one moderator.**

**Should check**

8. ~~After "Baby has arrived" the AI loses personal context~~ (fixed).
9. Existing users with `currentMode: 'baby'` now land on pregnancy Home.
10. Older entries keep the `week` stored at logging time (on `main` that was the current week, not the entry's date). Weeks are only recalculated when the due date is edited.
11. Analytics volume will drop (opt-in only), and dashboards that used the removed parameters stop receiving them.
12. **iOS photos:** the server accepts only JPEG, PNG, WebP and GIF. Confirm iOS HEIC photos are converted by the picker (it uses `quality: 0.7`).
13. ~~Crashlytics ran without consent~~ (now opt-in, Phase B).
14. **Consent scope:** consent is stored per device and isn't reset on sign-out.
15. **Leftover community data:**
    - Deleting a post (`communityService.deletePost`) leaves its `likes` and `comments` subcollections behind.
    - The community feed query has no limit.
    - Reports about deleted users remain.

16. ~~Reminders only scheduled from the Reminders screen~~ (fixed).
17. ~~Offline banner never mounted~~ (fixed in Phase B).
18. **AI context:** PDF chat attachments are never sent to the AI. The "upcoming appointments" gap is fixed.
19. **Plus gating is enforced in the app only**, not in the rules. Only the AI quota is enforced on the server.
20. ~~Paywall has no Terms or Privacy links~~ (fixed).
21. **Length limits:**
    - UI: posts 1000 characters, comments 500.
    - Rules: posts 2000, comments 1000.
22. **Trimester boundaries** differ between `lib/journal.ts`, `featurePriority`, and the server prompt and chat suggestions.

**Housekeeping**

23. **Unused or misplaced code:**
    - `@shopify/flash-list` is unused.
    - `test-renderer` and `@react-native/jest-preset` belong in devDependencies.
    - Dead helpers: `getPriorityTabs`, `getRecommendedFeatures`, `subscribeToActivePregnancy`.
24. ~~Stale "Premium" copy~~ (fixed).
25. ~~Diagnostic `console.log` in `config/firebase.ts`~~ (fixed).
26. **Deferred on purpose:**
    - FlashList for long lists
    - 60 fps check on a mid-range Android
    - native offline after restart (v1.1)
    - baby mode (v1.1)
