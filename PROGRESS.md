# NewLifeJournal — Engineering Progress

> **For resuming agents:** Read this file first. It tells you exactly where we are, what's done, what's next, and the conventions to follow. The EM role is Claude — coordinate two engineer agents per sprint, run a QA agent after each, and update this file before every commit.

---

## Project Overview

React Native (Expo 54) pregnancy tracking app. Firebase Firestore + Auth. TypeScript throughout. Teal color scheme (`#81bec1`). See `CLAUDE.md` for full architecture, patterns, and conventions.

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

### Sprint 5 — **NEXT** 🚀
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

*Last updated: Sprint 4 complete. Sprint 5 (Polish) ready to execute.*
