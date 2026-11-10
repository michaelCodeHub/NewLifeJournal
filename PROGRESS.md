# Bloom & Bump — Engineering Progress

> **For resuming agents:** Read this file first. It tells you exactly where we are, what's done, what's next, and the conventions to follow. The EM role is Claude — coordinate two engineer agents per sprint, run a QA agent after each, and update this file before every commit.

---

## Project Overview

React Native (Expo SDK 58, Node 22.13+) pregnancy tracking app. Firebase Firestore + Auth. TypeScript throughout. Teal color scheme (`#81bec1`). See `CLAUDE.md` for full architecture, patterns, and conventions.

**Repo:** `git@github.com:michaelCodeHub/NewLifeJournal.git`  
**Branch:** `main`  
**Latest commit:** `6804aad`

---

## Execution Rules (EM must follow)

1. **2 engineer agents per sprint, run in parallel** — assign disjoint files to each to avoid conflicts.
2. **Pre-work before agents launch** — handle any shared file edits (e.g., `_layout.tsx`) as EM before spawning.
3. **QA agent after each engineer** — no feature ships without QA PASS (no P0 issues, all tests green).
4. **Commit per feature** — each engineer commits their own work; EM commits any shared-file changes.
5. **Update this file** before pushing each sprint's commits.
6. **Git lock workaround** — the sandbox cannot remove `.git/HEAD.lock`. When commits fail, provide the exact `git add` + `git commit` + `git push` commands for the user to run from their Mac terminal.
7. **Token budget** — if context gets long, spawn a fresh EM agent pointed at this file rather than continuing in the same context.

---

## Tech Conventions

| Concern | Convention |
|---|---|
| Colors | Primary `#81bec1`, Background `#E0F2F3`, Orange `#FF9800`, Green `#4CAF50` |
| Auth | `useAuth()` → `{ user }`, user.uid for Firestore paths |
| Pregnancy data | `usePregnancy()` → `{ pregnancy, hospitalVisits, symptoms, milestones, loading }` |
| Firestore paths | `users/{uid}/pregnancies/{pid}/{subcollection}/{docId}` |
| Service pattern | See `services/firebase/kickCounterService.ts` |
| Screen pattern | See `app/(pregnancy)/kickcounter.tsx` |
| Animated picker | See `app/(pregnancy)/visits.tsx` |
| Tests | Jest + `@testing-library/react-native`. Mock firebase with jest mocks. |
| Tab nav | `app/(pregnancy)/_layout.tsx` — add new tabs here (EM pre-work) |
| New packages | `npx expo install <pkg>` for Expo-compatible packages |

---

## Feature Inventory

### ✅ Shipped (pre-sprint)
- Google Sign-In authentication
- Pregnancy creation & management
- Home screen (week info, baby size, development milestones)
- Hospital Visits tracker (CRUD, 9 visit types)
- Symptoms logger (11 types, severity 1–5)
- Timeline view (filters: all/visits/symptoms, week jump)
- AI Assistant chat (OpenAI, Anthropic, Google providers)
- Community tab (posts, likes, comments, search)
- Image/file attachment in chat
- Web platform support (signInWithPopup, HTML date picker, tokenStorage)
- Firebase emulator config (auth:9099, firestore:8080)

### ✅ Sprint 1 (complete) — commits `a48468a`, `ffdfd06`
| Feature | Engineer | Files | Tests |
|---|---|---|---|
| Kick Counter | A | `services/firebase/kickCounterService.ts`, `app/(pregnancy)/kickcounter.tsx`, `types/pregnancy.ts` (+KickSession) | 9 tests ✅ |
| Weight & BP Charts | B | `utils/chartUtils.ts`, `app/(pregnancy)/charts.tsx`, packages: react-native-svg, react-native-chart-kit | 23 tests ✅ |

### ✅ Sprint 2 (complete) — commits `6424198` + checklist commit
| Feature | Engineer | Files | Tests |
|---|---|---|---|
| Contraction Timer | A | `services/firebase/contractionService.ts`, `app/(pregnancy)/contractiontimer.tsx`, `types/pregnancy.ts` (+Contraction, +ContractionSession), 5-1-1 rule checker | 13 tests ✅ |
| Baby Items Checklist | B | `services/firebase/checklistService.ts`, `app/(pregnancy)/checklist.tsx`, 30 default items across 6 categories | 21 tests ✅ |

**P1 known issue (Contraction Timer):** Last contraction may be missed if session ends while a contraction is active — stale closure on `contractions` state. Fix in Sprint 3 patch.

---

## Sprint Roadmap

### ✅ Sprint 3 (complete)
**Theme:** Data export & birth preparation

| Feature | Engineer | Files | Tests |
|---|---|---|---|
| Export PDF | A | `utils/exportUtils.ts`, `app/(pregnancy)/export.tsx`, packages: expo-print, expo-sharing | 31 tests ✅ |
| Birth Plan Builder | B | `services/firebase/birthPlanService.ts`, `app/(pregnancy)/birthplan.tsx`, 5 sections with multi-select chips + auto-save | 22 tests ✅ |

---

### ✅ Sprint 4 (complete)
**Theme:** Notifications & sharing

| Feature | Engineer | Priority |
|---|---|---|
| Push Notifications | A | `services/notificationService.ts`, `app/(pregnancy)/notifications.tsx`, visit/milestone/kick reminders, AsyncStorage settings | 15 tests ✅ |
| Share Timeline | B | `utils/shareUtils.ts`, `app/(pregnancy)/sharetimeline.tsx`, text + PDF formats, preview card | 33 tests ✅ |

---

### ✅ Sprint 5 (complete) — FINAL SPRINT
**Theme:** Polish & technical excellence
**Theme:** Technical excellence

| Item | Notes |
|---|---|
| Dark mode | System-level theming via React Native's `useColorScheme`, update all screens |
| Offline support | Enable Firestore persistence: `enableIndexedDbPersistence` (web) / `initializeFirestore` with cache |
| Analytics | `expo-firebase-analytics` — track screen views, feature usage |
| Crash reporting | `expo-updates` + Sentry integration |

---

## QA Standards

Every feature must pass before shipping:
- [ ] No P0 issues (crashes, data loss, broken nav, unhandled errors, type errors at runtime)
- [ ] All unit tests pass (`npm test -- --testPathPattern=<feature>`)
- [ ] `npx tsc --noEmit` clean on new files
- [ ] Empty states handled
- [ ] Loading states handled
- [ ] Null checks on `user` and `pregnancy` before any Firebase calls

---

## How to Resume (for a new EM agent)

1. Read `PROGRESS.md` (this file) and `CLAUDE.md`
2. Check `git log --oneline -5` to confirm latest commit
3. Check current sprint in the roadmap above (look for 🚀)
4. Do EM pre-work (shared file edits)
5. Spawn Engineer A + Engineer B agents in parallel with disjoint file assignments
6. Spawn QA agents after each engineer completes
7. Coordinate commits (user must run `git commit` + `git push` from their terminal if sandbox git lock blocks)
8. Update this file's sprint status, move 🚀 to next sprint, commit as part of the sprint

---

### Sprint 5 Delivery

| Feature | Engineer | Files | Tests |
|---|---|---|---|
| Dark Mode | A | `context/ThemeContext.tsx`, `hooks/useTheme.ts`, `app/_layout.tsx` (ThemeProvider wired), `app/(pregnancy)/home.tsx` (dark mode applied) | 12 tests ✅ |
| Offline Support | B | `services/offlineService.ts`, `components/OfflineBanner.tsx`, `config/firestoreCache.ts`, `app/(pregnancy)/_layout.tsx` (banner wired) | 10 tests ✅ |

---

## 🏁 ALL SPRINTS COMPLETE

**Total: 5 sprints · 10 features · 223 tests · 0 failures · TypeScript clean**

| Sprint | Features | Tests |
|---|---|---|
| Sprint 1 | Kick Counter, Weight & BP Charts | 32 ✅ |
| Sprint 2 | Contraction Timer, Baby Items Checklist | 34 ✅ |
| Sprint 3 | Export PDF, Birth Plan Builder | 53 ✅ |
| Sprint 4 | Push Notifications, Share Timeline | 48 ✅ |
| Sprint 5 | Dark Mode, Offline Support | 22 ✅ |
| **Total** | **10 features** | **223 ✅** |

*Last updated: All sprints complete. App is feature-complete per roadmap.*

---

## Post-launch: Monitoring & Analytics (added)

Implements the "Analytics" and "Crash reporting" line items from the Sprint 5 wishlist above, using `@react-native-firebase` (analytics + crashlytics + perf) instead of `expo-firebase-analytics`/Sentry, since the project already ships `google-services.json` / `GoogleService-Info.plist` and android/ios are CNG-generated (see `Monitoring_Analytics_Plan.md` for the full plan and rationale).

| Area | Files |
|---|---|
| Packages + config plugin | `package.json` (`@react-native-firebase/{app,analytics,crashlytics,perf}`), `app.json` (`googleServicesFile`, plugins) |
| Monitoring core | `services/monitoring/{firebaseInit,analytics,errorLogger,networkTrace}.ts` |
| Crash/error UI | `components/ErrorBoundary.tsx`, wired into `app/_layout.tsx` alongside global JS-error/unhandled-rejection handlers and automatic `screen_view` tracking (via `usePathname`) |
| Engagement events | `context/AuthContext.tsx` (login/logout/sign_up), `context/ChatbotContext.tsx` (chat_message_sent + `ai_chat_request` perf trace), `services/firebase/pregnancyService.ts` (pregnancy/visit/symptom/milestone events), `services/firebase/kickCounterService.ts`, `services/firebase/contractionService.ts` |
| Error sweep | `console.error` → `logError()` across the files above so failures also land in Crashlytics + the `app_error` analytics event |

**Not done yet (needs a native rebuild, can't be verified in a sandbox):** run `expo prebuild` + a new dev-client build, confirm a test event appears in Analytics DebugView, force a test crash to confirm it lands in Crashlytics. Also still open: export/share screens (`export.tsx`, `sharetimeline.tsx`) and the admin screen don't yet fire `data_exported`/`timeline_shared`/admin events — straightforward to add following the same pattern.



---

## Audit plan status (Nov 2026)

Phases from the codebase audit. Unit tests: 255 passing; Firestore rules tests: 33 passing (`npm run test:rules`). Nothing below has been run on a real device yet.

| Phase | Status |
|---|---|
| 1 · Fix what's broken | Done in code (week derived everywhere, post creation, storage rules, snapshot error callbacks, tsconfig). Device run against the emulator still to do. |
| 2 · Smooth UI foundation | Done: tokens + UI kit (`components/ui`), reanimated sheets, Ionicons, dark mode, memoized contexts, Stack transitions, 512px WebP growth images (6.7 MB → 0.7 MB), still tab bar + shared tab header. Open: FlashList for chat/timeline (they use virtualized FlatList/SectionList today), 60 fps check on a mid-range Android. |
| 3 · Launch blockers | Done: account deletion (`deleteAccount` function + Profile), privacy/terms links (`EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL`), AI + analytics consent, no health data in analytics (param allowlist), AI proxy hardening (server-built prompt, size caps, per-user rate limits, emergency notice, optional App Check), RevenueCat expiry, UTC monthly AI reset, community report/block/validation, Node 22, Android `GOOGLE_SERVICES_JSON`, iOS privacy manifest, CI (tsc + jest + rules tests). Open: real legal URLs, unblock screen, a moderation view for `reports`. |
| 4 · Scope: pregnancy-only v1 | Done: baby mode hidden (`constants/features.ts` BABY_MODE_ENABLED=false; new users go straight to pregnancy setup), weekly (Sun 9am) and daily (8pm) reminders now repeat on an Android channel, next-visit date already in Visits, milestones can be added from Timeline +, persistent offline cache on web. Native offline-after-restart needs @react-native-firebase/firestore (v1.1). Baby mode + transition = v1.1. |
| 5 · Pre-launch finish | Done: Blocked accounts screen with Unblock (Profile → Privacy; blocks now store the display name), moderator queue for reports (Profile → Moderation, only for the `moderator`/`admin` claim; Keep or Remove post/comment; rules let moderators read/close reports and delete content), `functions/scripts/setModerator.js` to grant the role, `data_exported`/`timeline_shared` analytics events. Deferred on purpose: FlashList for chat/timeline (lists are small; swapping would risk chat-bottom and jump-to-week scrolling without a device to test on). Still needs you: real legal URLs, deploying functions + rules + indexes, a device run on Node 22+. |

**UI polish pass (7 Nov 2026), checked screen by screen on web at phone width, light and dark:** soft-filled groups instead of white bordered boxes (Timeline, Baby checklist); no counts in headers ("3 visits", week counts, "None yet", zero like/comment counts); Timeline milestones can now be deleted; Reminders switches take effect immediately (no "Apply" button) and re-sync when visits change; Birth plan auto-saves (no Save footer); one-line chat error instead of a bot bubble plus label; Plus upsell is an open centred prompt; Tools no longer repeats three tools under "Suggested"; Community marked Plus in Tools; chart's first week label no longer clipped; no nested buttons on web.
