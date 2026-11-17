# v1.0 release plan — client requirements vs `dev`

**Source of requirements:** `PRD_v1.0.md` (on `main`, dated 27 Jun 2026, "Ready for Engineering Review"). It is the client's definition of v1.0.

**Compared against:** the `dev` branch as of 17 Nov 2026. Each item was checked in the code, not taken from the PRD's own status column, which is out of date.

**Headline:** Phases A and B are built on `dev`, and Phase C is prepared: OS minimums pinned, Expo packages current (`expo-doctor` 20/20), draft legal pages ready to host, store listing and privacy answers written, and a device QA plan. **What remains needs the client:** filling in and approving the legal pages, account access to deploy and set up RevenueCat and the stores, screenshots, the device QA run, and the decisions in §3. Nothing has been run on a device yet.

Legend: ✅ done · 🟡 partly done / differs from spec · ❌ missing · ➕ built beyond the v1 spec

---

## 1. Feature-by-feature status

### Authentication & onboarding

| # | Requirement | Pri | `dev` | Gap |
|---|---|---|---|---|
| F01 | Google Sign-In | P0 | ✅ | Email/password added too (➕) |
| F02 | Welcome / splash with brand polish | P0 | 🟡 | Animated brand splash exists. Missing: the tagline "Your journey. Your journal." and the illustrated splash described in PRD §9.6 (design decision) |
| F03 | Sign-out + account deletion | P0 | ✅ | Type "DELETE" to confirm (`components/profile/DeleteAccountSheet.tsx`), server-side deletion (`deleteAccount`), then "Your account and all data have been deleted." (`app/(auth)/account-deleted.tsx`) |
| F04 | Mode selection (Pregnancy / Baby) | P0 | ✅ | `choose-mode.tsx`; both options live (`BABY_MODE_ENABLED = true`) |
| F05 | Pregnancy setup form | P0 | ✅ | |
| F06 | Baby setup form | P0 | ✅ | `app/(onboarding)/create-baby.tsx`: name, birth date, birth weight/length, gender (shared `components/baby/BabyForm.tsx`) |
| F07 | Pregnancy → Baby transition | P0 | ✅ | `app/(pregnancy)/arrived.tsx`: shown from week 37; confetti + "Congratulations!", form pre-filled from the pregnancy → creates the baby with `fromPregnancyId`, completes the pregnancy with `transitionedToBabyId`, switches to baby mode, "Welcome, [name]! Day 1". "Before you were born" in baby Tools/Profile. Undo kept |

### Pregnancy tracking

| # | Requirement | Pri | `dev` | Gap |
|---|---|---|---|---|
| F08 | Weekly home screen | P0 | ✅ | Content now bundled + Firestore override |
| F09 | Hospital visits | P0 | ✅ | |
| F10 | Symptoms logger | P0 | ✅ | |
| F11 | Timeline with filters | P0 | ✅ | |
| F12 | Milestone logging | P1 | ✅ | |
| F13 | Kick counter | P1 | ✅ | On Home from week 20; start and first-movement times; 7-day "Kicks per day" chart; amber note when the last session had fewer than 10; the live session survives leaving the screen or restarting (`hooks/useStoredSession.ts`) |
| F14 | Contraction timer | P1 | ✅ | 5-1-1 now needs the pattern to hold for a full hour (start-to-start ≤ 5 min, ≥ 1 min long); **Share summary** (live session and history rows); live session survives restarts |
| F15 | Weight tracking with trend | P1 | ✅ | Health charts (Plus) |

### Baby tracking (built on `dev`, Phase A)

| # | Requirement | Pri | Notes |
|---|---|---|---|
| F16 | Baby home screen | P0 | ✅ `app/(baby)/(tabs)/home.tsx`: age, day of life, today's feeds/diapers/sleep, running timers, quick-log bar (Feed · Diaper · Sleep · Growth), last feed/diaper, recent entries |
| F17 | Feeding log: breast L/R/both, bottle, solid, amount ml/oz, timer or manual, notes | P0 | ✅ `components/baby/FeedSheet.tsx`. Timer start time is stored in Firestore, so it survives leaving the app |
| F18 | Diaper log: wet/dirty/both, colour, notes; ≤ 5-second interaction | P0 | ✅ `components/baby/DiaperSheet.tsx` (type → Save; colour/notes optional) |
| F19 | Sleep tracker: live timer or manual, daily total | P0 | ✅ `components/baby/SleepSheet.tsx` + "Woke up" card on Home; sleep split at midnight for daily totals. Lock-screen widget: not built (optional in PRD) |
| F20 | Growth records: weight, height, head circumference | P1 | ✅ `app/(baby)/growth.tsx` (trend chart per measurement, birth stats as first point) + `GrowthSheet` |
| F21 | Vaccine & health events | P1 | ✅ `app/(baby)/health.tsx` (vaccine/checkup/illness/medicine, next-dose/follow-up, "Coming up") + `HealthSheet` |
| F22 | Baby activity timeline: grouped by day, filters All/Feeding/Diaper/Sleep/Health, day summary, tap to edit | P0 | ✅ `app/(baby)/(tabs)/timeline.tsx` |

### AI chat

| # | Requirement | Pri | `dev` | Gap |
|---|---|---|---|---|
| F23 | Multi-provider AI | P0 | ✅ | Behind a server proxy (also meets NFR 8.2) |
| F24 | Pregnancy context | P0 | ✅ | Built on the server. Baby mode: the server builds the baby's context (age, last-24h feeds/diapers/sleep, growth, health) + newborn emergency rules |
| F25 | Chat history persistence | P1 | ✅ | + Clear chat |
| F26 | Suggested prompts | P1 | ✅ | "What's my baby doing at week N?", "Is [latest symptom] normal at week N?", then stage questions; tapping sends; `suggested_prompt_tapped` event |

### Community, notifications, profile, polish

| # | Requirement | Pri | `dev` | Gap |
|---|---|---|---|---|
| F27 | Community | P1 | ✅ | + report, block, moderation (➕) |
| F28 | Push notification infrastructure | P1 | 🟡 | Local notifications only (no FCM/APNs server push). Covers F29/F30; real push is a client decision (§3) |
| F29 | Weekly "You're now Week X" | P1 | ✅ | One notification per week change, 9am on the day the week starts, "You're now week N" + the baby's size; next 8 scheduled, re-synced daily |
| F30 | Appointment reminders from `nextVisitDate` | P2 | ✅ | |
| F31 | Profile screen | P0 | ✅ | Header, stats, **My babies** and **Past pregnancies** (read-only journal), account, app info |
| F32 | Privacy & data settings | P0 | ✅ | Storage statement, delete, privacy policy, analytics opt-in and **crash-report opt-in** toggle. Export is still a Plus PDF rather than "Coming soon" (decision in §3) |
| F33 | App settings: theme, notification prefs | P1 | ✅ | |
| F34 | Admin screen out of production | P0 | ✅ | Removed completely (➕) |
| F35 | Empty and error states everywhere | P0 | ✅ | Re-check the new baby screens |
| F36 | Offline graceful degradation | P1 | 🟡 | Offline banner under every screen header; writes queue and sync while the app is open. Data surviving a restart while offline on native still needs `@react-native-firebase/firestore` (v1.1) |
| F37 | App icon, splash, store assets | P0 | 🟡 | Icons and splash done (`BloomAndBump/`). **Store screenshots and metadata** are not done |
| F38 | Privacy policy + Terms | P0 | 🟡 | Links are wired everywhere (env vars). **The documents themselves don't exist yet** (client) |

### Built on `dev` beyond the v1 PRD

Plus subscription and paywall (from the client's `MONETIZATION_PLAN.md`), charts (PRD v1.1), local reminders (v1.1), community moderation, PDF export (v2.0), share timeline, birth plan (v2.1), baby checklist, dark mode, edit pregnancy and entries, AI safety layer.

---

## 2. Non-functional requirements & launch gates

| Requirement (PRD §) | `dev` | Gap / action |
|---|---|---|
| 8.1 Performance: cold start ≤ 2.5 s, timeline ≤ 1.5 s, first AI token ≤ 3 s, 60 fps | ❓ | Never measured; nothing has run on a device. AI answers aren't streamed, so the "first token ≤ 3 s" target means the whole reply. Needs a decision: add streaming, or relax the target |
| 8.2 No ad-network PII; AI keys proxied; rules lock data | ✅ | |
| 8.2 "No crash reporting without opt-in" | ✅ | Crashlytics/Performance off by default (`firebase.json`), enabled only by "Send crash reports"; `logError` checks consent |
| 10.2 Analytics with `allow_ad_personalization_signals = false` | ✅ | `firebase.json` (`google_analytics_default_allow_ad_personalization_signals: false`, no ad id) + consent mode with ad storage/personalisation denied |
| 8.3 Tap targets ≥ 44pt, labels not colour-only, Dynamic Type, screen-reader labels | 🟡 | Severity labels include text ✅; `IconButton` requires a label ✅. Do an accessibility pass on a device (VoiceOver/TalkBack, large text) |
| 8.4 No silent data loss | ✅ | Toasts on every write error |
| 8.4 Offline persistence | 🟡 | See F36 |
| 8.4 Forms restore state when the app is backgrounded | ✅ | New visit, symptom and feed (baby Home) forms are kept as device drafts while open and reopened on the next launch (`hooks/useFormDraft.ts`) |
| 8.5 iOS 16.0 / Android SDK 26 minimum | ❓ | Not set explicitly. Pin with `expo-build-properties` (`ios.deploymentTarget: "16.0"`, `android.minSdkVersion: 26`) after checking Expo SDK 58 defaults |
| 8.5 Store metadata: description, screenshots (6.5", 5.5", 12.9" iPad), keywords, privacy label | ❌ | `supportsTablet: true`, so iPad screenshots are required |
| 10.1 Rating prompt 3 days after first log | ✅ | `services/reviewPrompt.ts` (`expo-store-review`): asked once, right after a log, ≥ 3 days after the first |
| 10.2 Analytics events | ✅ | All PRD events: `onboarding_started`, `onboarding_completed`, `onboarding_mode_selected`, `pregnancy_created`, `baby_created`, `transition_completed`, `visit_added`, `symptom_logged`, `kick_counted`, `contraction_timed`, `chat_message_sent`, `suggested_prompt_tapped`, `timeline_filtered`, `week_selected`, `app_opened` (+ baby logging events). Opt-in only |
| §11 QA gate: device matrix (iPhone SE/14/15 Pro Max, Pixel 6, Galaxy S22), airplane mode, accessibility, full E2E incl. "transition to baby → log feed" | ❌ | Not started |

---

## 3. Decisions needed from the client before building

1. **Baby mode in v1?** The PRD says yes (P0, launch gate). `dev` says v1.1. This plan assumes **yes**.
2. **Brand colours.** The PRD palette is `#81bec1`; `dev` uses the logo teal `#3AA3A9` with a new design system. Confirm the new look.
3. **What is Plus?** The PRD doesn't mention paid features. `dev` gates charts, birth plan, export, share and community. Are any **baby features** Plus?
4. **Export my data.** The PRD says "Coming soon" in v1. `dev` has it as a Plus PDF. Should free users be able to export (data-rights expectation)?
5. **Delete-account UX.** Must users type "DELETE", as the spec says?
6. **Real push (FCM) or local notifications** for v1?
7. **AI response streaming.** Needed to meet the "first token ≤ 3 s" target.
8. **Splash illustration** (PRD §9.6) and **store screenshots**: who produces them?
9. **Legal documents.** The client provides the privacy policy and terms content and URLs.

---

## 4. Implementation plan

The estimates are in developer-days for one developer and don't include device QA and store review. Phases A and B can run in parallel with C.

### Phase A: baby mode (P0) — ✅ built on `dev`, 17 Nov 2026 (not yet device-tested)

**Data model.** `firestore.rules` already allows `users/{uid}/babies/**` for the owner, and `deleteAccount` already removes it recursively.

```
users/{uid}/babies/{babyId}            name, birthDate, birthWeight?, birthHeight?, gender?, fromPregnancyId?, status, createdAt, updatedAt
  ├─ activities/{id}                   type: feeding|diaper|sleep, startedAt, endedAt?, details{…}, notes, createdAt
  ├─ growth/{id}                       date, weightKg?, heightCm?, headCm?, notes
  └─ health/{id}                       type: vaccine|illness|medicine|checkup, date, title, notes
users/{uid}/pregnancies/{id}           + transitionedToBabyId (already in types)
users/{uid}                            currentMode: 'pregnancy' | 'baby'
```

| # | Work | Files | Est. |
|---|---|---|---|
| A1 | Baby types update (diaper colour, units, status), `babyService.ts` (CRUD + listeners), `BabyContext` (active baby, activities by day, running sleep/feed), rules tests for `babies/**` | `types/baby.ts`, `services/firebase/babyService.ts`, `context/BabyContext.tsx`, `rules-tests/` | 2 |
| A2 | Baby tab shell: Home · Timeline · Tools · Ask · You, reusing `TabBar`; switch `BABY_MODE_ENABLED` on; `AuthGate` routes `currentMode === 'baby'` | `app/(baby)/(tabs)/*`, `app/_layout.tsx`, `constants/features.ts` | 1 |
| A3 | **Baby home (F16):** "Welcome, [name]! Day N" / age, today's summary (feeds, diapers, sleep), quick-log bar 🍼 Feed · 💧 Diaper · 😴 Sleep · 📏 Growth, a running-timer card | `app/(baby)/(tabs)/home.tsx` | 2 |
| A4 | **Feed sheet (F17):** type (breast L/R/both, bottle, solid), amount ml/oz, live timer *or* manual duration, notes. The timer stores a start timestamp in Firestore so it survives an app restart | `components/baby/FeedSheet.tsx` | 2 |
| A5 | **Diaper sheet (F18):** type, colour, notes; two taps to save | `components/baby/DiaperSheet.tsx` | 0.5 |
| A6 | **Sleep (F19):** start/stop live timer (persisted), manual entry, daily total | `components/baby/SleepSheet.tsx` | 1.5 |
| A7 | **Baby timeline (F22):** grouped by day (Today / Yesterday / date), filters All/Feeding/Diaper/Sleep/Health, day summary header, tap to edit, delete | `app/(baby)/(tabs)/timeline.tsx` | 2.5 |
| A8 | **Growth (F20) and health/vaccines (F21):** log sheets + list screens; simple growth chart reusing `TrendChartCard` | `app/(baby)/growth.tsx`, `app/(baby)/health.tsx` | 2 |
| A9 | **Transition (F07):** "Baby has arrived" becomes a celebration screen (reanimated confetti, no new dependency) with name pre-filled from the pregnancy, birth date, weight, height and optional gender → creates the baby (`fromPregnancyId`), sets the pregnancy `completed` + `transitionedToBabyId`, sets `currentMode = 'baby'`, lands on baby home. Keep Undo | `components/BabyArrivedSheet.tsx` → `app/(pregnancy)/arrived.tsx`, `pregnancyService`, `babyService` | 2 |
| A10 | **Onboarding (F04, F06):** choose-mode and a real create-baby form for people who join after the birth | `app/(onboarding)/choose-mode.tsx`, `create-baby.tsx` | 1 |
| A11 | **Pregnancy history:** "Before you were born" link on the baby profile; read-only pregnancy timeline by id | `app/(baby)/pregnancy-history.tsx` | 1 |
| A12 | **AI in baby mode:** server prompt uses the baby's age and recent feeds/sleep/diapers, plus newborn-safety red flags (fever under 3 months, breathing, dehydration); client chat in the baby tabs | `functions/src/systemPrompt.ts`, `functions/src/aiChat.ts` | 1.5 |

**What was built (A1–A12 all done):**

- **Data:** `types/baby.ts`, `services/firebase/babyService.ts`, `context/BabyContext.tsx`. Feeds, diapers and sleep are one `activities` collection; a timer is a doc without `endedAt`.
- **Screens:** `app/(baby)/(tabs)/{home,timeline,tools,chat,profile}.tsx`, `app/(baby)/{growth,health,editbaby,pregnancy-history}.tsx`, `app/(pregnancy)/arrived.tsx`, `app/(onboarding)/{choose-mode,create-baby}.tsx`.
- **Components:** `components/baby/*` (five log sheets, `useLogSheets`, `useEntryOptions`, entry rows, running-timer card, confetti, baby form), `components/ui/DateTimeField.tsx` (date + time picker), `components/profile/ProfileParts.tsx` (shared by both "You" tabs), `components/chat/ChatScreen.tsx` (shared Ask tab).
- **Chat:** conversations live under the pregnancy or the baby (`ChatScope` in `chatbotService.ts`).
- **Server:** `aiChat` takes an optional `babyId`; `systemPrompt.ts` builds the baby context; newborn red flags added.
- **Tests:** `__tests__/unit/babyJournal.test.ts`, `babyService.test.ts`, rules tests for `babies/**`; e2e flows `baby_transition.yaml`, `baby_sleep_timer.yaml`. The web bundle builds (`npx expo export --platform web`).

**Still to check on a device:** both timers across a restart, the date/time picker sheet on iOS and Android, the confetti and transition, and the 5-second diaper target.

**Decisions taken while building** (confirm with the client):

- Baby features are **free**; only Community stays Plus.
- Units are ml/oz for feeds and kg/cm for growth.
- The app keeps the most recent ~600 activities live; older ones stay in Firestore.
- Removing a baby profile deletes its data. "Undo baby has arrived" keeps the baby profile.

### Phase B: finish partial requirements — ✅ built on `dev`, 17 Nov 2026 (not yet device-tested)

| # | Work | Req | Est. |
|---|---|---|---|
| B1 | Profile: **My pregnancies** (list past, open read-only) and **My babies** (switch active baby) | F31 | 1.5 |
| B2 | Delete account: type "DELETE", then a success screen (if confirmed) | F03 | 0.5 |
| B3 | Kick counter: show from week 20 on Home; first-kick time; 7-day bar chart; amber note under 10; keep the live session across navigation and app restarts | F13 | 1.5 |
| B4 | Contraction timer: 5-1-1 over ≥ 1 hour; Share summary; keep the live session across restarts | F14 | 1 |
| B5 | Dynamic AI chips (current week, latest symptom) + `suggested_prompt_tapped` event | F26 | 0.5 |
| B6 | Week-specific weekly notification ("You're now Week X"), rolling 8-week schedule | F29 | 1 |
| B7 | Crash-reporting toggle, Crashlytics opt-in (consent), ad-personalisation off | F32, 8.2, 10.2 | 1 |
| B8 | Offline banner placed safely (e.g. inside `Screen` under the header) | F36 | 0.5 |
| B9 | Missing analytics events (§2) + `app_opened` | 10.2 | 0.5 |
| B10 | Rating prompt 3 days after first log (`expo-store-review`) | 10.1 | 0.5 |
| B11 | Form drafts restored after backgrounding (visit, symptom, feed) | 8.4 | 1 |

**Built (B1–B11 all done):**

- **Profile:** Past pregnancies (`PastPregnancies`; the journal screen moved to `app/(pregnancy)/pregnancy-history.tsx`).
- **Account deletion:** type-DELETE sheet + confirmation screen.
- **Kick counter:** week-20 Home shortcut (contractions from week 28, milestones before), first-movement time, 7-day chart (`components/timers/DayBars.tsx`, `perDay`), low-count note, persisted live session.
- **Contraction timer:** time-based 5-1-1 (`check511Rule`), `contractionSummary` + Share, persisted live session.
- **Ask:** dynamic chat chips.
- **Reminders:** per-week "You're now week N" notifications (`scheduleWeekUpdates`).
- **Privacy:** crash-report consent + ad personalisation off.
- **Offline banner:** in `Header` (`components/ui/OfflineBanner.tsx`).
- **Monitoring:** remaining analytics events, store rating prompt.
- **Form drafts:** visit, symptom and feed.

**Tests:** 304 Jest tests pass; the web bundle builds.

**Still to check on a device:**

- the restored kick and contraction sessions after killing the app
- the drafts after killing the app with a form open
- the weekly notifications arriving
- the rating dialog in TestFlight / internal testing
- the offline banner under each header style

### Phase C: launch readiness — prepared on `dev`; remaining steps need client access (see [STORE_SUBMISSION.md](STORE_SUBMISSION.md))

| # | Work | Owner |
|---|---|---|
| C1 | ✅ Pinned with `expo-build-properties`: iOS **16.4** (Expo SDK 58's own minimum — the PRD's 16.0 isn't possible, but every iPhone that runs 16 can run 16.4) and Android **SDK 26**. Expo packages updated to the SDK 58 patch versions | Dev |
| C2 | 🟡 Runbook ready ([STORE_SUBMISSION.md](STORE_SUBMISSION.md#release-runbook)): secrets → deploy rules/indexes/storage/functions/hosting → seed weeks → RevenueCat → EAS env → build. Needs client access | Dev + client access |
| C3 | 🟡 Draft privacy policy, terms and account-deletion pages in `legal-site/` (written from what the code does), served by Firebase Hosting at `newlifejournal-e6826.web.app/{privacy,terms,delete-account}`. Hosting deploy is **blocked** until every `[PLACEHOLDER]` is filled (`legal-site/check-placeholders.js`). Needs client + lawyer | Client |
| C4 | 🟡 Listing copy within store limits, screenshot list and captions, App Review notes: [STORE_SUBMISSION.md](STORE_SUBMISSION.md#store-listing-copy-c4). Screenshots themselves need a device/simulator run | Design / client |
| C5 | ✅ App Store privacy label, Play data-safety and age-rating answers: [STORE_SUBMISSION.md](STORE_SUBMISSION.md#privacy-answers-c5). Analytics made genuinely anonymous (no user id) and performance data added to the iOS privacy manifest so all three agree | Dev + client |
| C6 | 🟡 Test plan with device matrix, P0/P1 cases, offline, accessibility and performance measurement: [QA_TEST_PLAN.md](QA_TEST_PLAN.md). Needs devices and a tester | QA |

### Suggested order

1. **Week 1:** client decisions (§3) · A1–A2 · C1–C3 started
2. **Weeks 2–3:** A3–A9
3. **Week 4:** A10–A12 · B1–B5
4. **Week 5:** B6–B11 · C4–C5
5. **Week 6:** C6 device QA, fixes, store submission

Total: about **28 developer-days**, plus QA and store review. **Phases A and B are done**; what remains is Phase C (deploy, legal, store assets) and device QA.

### Definition of done for v1.0

- Every P0 row in §1 is ✅, and every P1 row is ✅ or explicitly deferred by the client in writing.
- §2 gates are green on the device matrix.
- `npx tsc`, `npm test` and `npm run test:rules` all pass in CI.
- The backend is deployed from the release commit.
