# NewLifeJournal — Monitoring, Analytics & Crash Reporting Plan

## Goal

Give the team visibility into four things: what users actually do in the app (engagement), whether network calls to Firebase and the AI providers are succeeding and how fast they are, when and why the app crashes, and where unhandled JS errors are happening. Right now none of this exists — there's no analytics, no crash reporting, and errors are only caught ad hoc with `console.error` and an `Alert.alert`.

## Chosen stack: All-Firebase

Since the app is already built on Firebase (Firestore, Auth) and the repo already contains `google-services.json` and `GoogleService-Info.plist`, the plan uses the native Firebase SDKs via `@react-native-firebase`, rather than introducing a new vendor:

- **`@react-native-firebase/app`** — required native core module.
- **`@react-native-firebase/analytics`** — user engagement: screen views, custom events, funnels, retention, viewable in the Firebase console / GA4.
- **`@react-native-firebase/crashlytics`** — native crash reporting, plus `recordError()` for handled JS exceptions, with breadcrumb logs and stack traces.
- **`@react-native-firebase/perf`** — automatic network request monitoring (latency, payload size, success/failure per HTTP call) and custom traces for slow operations (e.g. AI response time, Firestore reads).

Important caveat to flag: this is the "all-in-Firebase" choice, which reuses your existing project and avoids extra vendor sign-ups, but it's genuinely weaker than a tool like Sentry for crash diagnostics — Crashlytics gives less surrounding context per crash, no built-in alert-rule flexibility, and no source-map based deobfuscation beyond dSYM/mapping upload. That tradeoff is accepted here in exchange for simplicity and cost ($0, Spark-plan compatible for these three modules).

Note on native modules: `@react-native-firebase/*` requires native code, so it will **not** run in plain Expo Go — it needs your existing `expo-dev-client` build (which you already have) and a rebuild (`expo prebuild` + a new dev client / EAS build) after the packages are installed and the config plugin is added. Your `android/` and `ios/` folders already exist, so this is a straightforward rebuild, not a new native setup.

## What gets tracked

**User engagement** — screen views for every route (`(auth)`, `(onboarding)`, `(pregnancy)`, `(baby)` groups), and custom events for the actions that matter: signup/login, pregnancy or baby profile created, hospital visit added, symptom logged, chat message sent (with which AI provider), kick counter session, contraction logged, checklist item toggled, birth plan edited, data exported, timeline shared, admin actions.

**Network execution** — every `fetch` call (Firestore REST calls made under the hood, and the direct `fetch` calls in `services/ai/providers/*.ts`, `services/firebase/storageService.ts`, and `services/offlineService.ts`) gets latency, status code, and success/failure captured automatically by `@react-native-firebase/perf`'s HTTP monitoring. Custom traces are added around the AI chat round-trip specifically, since that's the slowest and most failure-prone call in the app.

**Crashes** — native crashes (JS and native-layer) are captured automatically once Crashlytics is initialized; no code changes needed beyond setup.

**Errors** — a single `logError()` helper is added and used everywhere the code currently does `console.error` or an empty catch block. It sends the error to Crashlytics (`recordError`) with context tags (screen, user action, pregnancyId) and also adds an Analytics event (`app_error`) so error frequency shows up next to engagement data. A React `ErrorBoundary` is added at the root layout to catch render-time errors that would otherwise produce a white screen, log them, and show a fallback UI instead of crashing silently.

## New files

- `services/monitoring/firebaseInit.ts` — initializes Analytics/Crashlytics/Perf once at app start, sets Crashlytics user identifier (uid, not email/PII) after login.
- `services/monitoring/analytics.ts` — thin wrapper: `trackEvent(name, params)`, `trackScreen(name)`, `setUserProperties(props)`. Every call site in the app imports from here, never straight from `@react-native-firebase/analytics`, so the underlying provider can be swapped later without touching call sites.
- `services/monitoring/errorLogger.ts` — `logError(error, context)` and `logHandledException(error, context)`, wraps Crashlytics `recordError` + an analytics event.
- `services/monitoring/networkTrace.ts` — helper to wrap the AI provider `fetch` calls in a named Perf trace (`ai_chat_request`) capturing provider name, latency, and outcome.
- `components/ErrorBoundary.tsx` — class component, wraps `app/_layout.tsx`'s `<Stack>`, reports to `logError`, renders a simple retry screen.
- A global `unhandledrejection`/`ErrorUtils.setGlobalHandler` hook (in `app/_layout.tsx` or a small `bootstrapErrorHandling.ts`) to catch promise rejections and JS errors that fall outside React's render cycle.

## Event taxonomy (starting set)

| Event | Fired from | Key params |
|---|---|---|
| `screen_view` | navigation state listener in root layout | `screen_name` |
| `login` / `logout` | `AuthContext` | `method` (google/email) |
| `pregnancy_created` / `baby_profile_created` | onboarding flows | `mode` |
| `visit_added` | `hospitalVisitService` | `visit_type`, `week` |
| `symptom_logged` | `symptomService` | `symptom_type`, `severity`, `week` |
| `chat_message_sent` | `ChatbotContext` | `provider`, `response_time_ms`, `success` |
| `kick_session_completed` | kick counter screen | `duration_s`, `kick_count` |
| `contraction_logged` | contraction timer | `duration_s`, `interval_s` |
| `data_exported` / `timeline_shared` | export/share screens | `format` |
| `app_error` | `errorLogger.ts` | `screen`, `message`, `fatal` (bool) |

This list is deliberately non-exhaustive to start — better to ship the pipeline and a handful of high-value events than block on a complete taxonomy.

## Implementation phases

**Phase 1 — Foundation.** Install the three `@react-native-firebase` packages, add the config plugin entries to `app.json`, run `expo prebuild`, rebuild the dev client. Add `firebaseInit.ts` and call it once from `app/_layout.tsx`. Verify a test crash and a test event show up in the Firebase console (this can take a few minutes to propagate for Crashlytics, is near-instant in the Analytics DebugView).

**Phase 2 — Crash & error capture.** Add `ErrorBoundary.tsx` around the root `<Stack>`. Add the global unhandled-rejection/JS-error hook. Sweep existing `catch` blocks in `services/firebase/*` and `services/ai/providers/*` to call `logError` instead of (or in addition to) `console.error`.

**Phase 3 — Network monitoring.** Confirm `@react-native-firebase/perf` is picking up the automatic HTTP instrumentation (it patches `fetch`/`XMLHttpRequest` globally, no per-call-site change needed for basic latency/status). Add the named custom trace around the AI provider round-trip in `services/ai/aiServiceFactory.ts` so slow/failed AI calls are distinguishable from Firestore calls in the Perf dashboard.

**Phase 4 — Engagement events.** Add `analytics.ts` wrapper. Wire up automatic `screen_view` tracking via an `expo-router` navigation state listener in the root layout. Add the custom events from the taxonomy table at their respective call sites (visit/symptom services, chat context, kick counter, contraction timer, export/share screens).

**Phase 5 — Verification & rollout.** Force a test crash in a dev build to confirm it lands in Crashlytics. Confirm events appear in Analytics DebugView while testing, then in the standard dashboard after 24h. Add a short section to `PROGRESS.md` documenting what's tracked, since this app already keeps that file up to date.

## Privacy note

This app handles pregnancy/health data, which is sensitive. Event parameters should stay structural (event names, counts, durations, enum values) and never include free-text notes, symptom descriptions, names, or emails. Crashlytics user identifier should be the Firebase `uid`, not the email address. Worth adding a line to the privacy policy noting that anonymized usage and diagnostic data is collected — flagging this as something to confirm with whoever owns the app's privacy policy, since that's a product/legal decision rather than an engineering one.

## Where to view the data

Firebase console → Analytics (engagement events, funnels, DebugView for testing), Crashlytics (crash-free users %, individual crash stack traces), Performance (network request latency/success rate, custom traces). No new dashboard needs to be built for v1.
