# NewLifeJournal — Product Requirements Document
**Version:** 1.0 (Public Launch)
**Author:** Product Management
**Date:** June 27, 2026
**Status:** Ready for Engineering Review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Market Context](#2-market-context)
3. [Target Users & Personas](#3-target-users--personas)
4. [Problem Statement](#4-problem-statement)
5. [Product Vision & Positioning](#5-product-vision--positioning)
6. [Feature Inventory — Current State vs. Launch Requirements](#6-feature-inventory--current-state-vs-launch-requirements)
7. [Feature Specifications](#7-feature-specifications)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Design System & UI Guidelines](#9-design-system--ui-guidelines)
10. [Analytics & Success Metrics](#10-analytics--success-metrics)
11. [Launch Readiness Checklist](#11-launch-readiness-checklist)
12. [Future Roadmap (Post v1.0)](#12-future-roadmap-post-v10)

---

## 1. Executive Summary

NewLifeJournal is a dual-mode pregnancy and baby tracking application for iOS and Android, built with React Native + Expo + Firebase. The app serves expectant mothers during pregnancy and continues their journey into early parenthood with a baby-tracking mode.

The v1.0 public launch milestone requires closing the gap between the current working prototype and a polished, privacy-first, App Store–ready product. This document captures every requirement engineering must deliver for launch, grounded in competitive research and validated user needs.

**Target Launch Platforms:** iOS (App Store) and Android (Google Play)

---

## 2. Market Context

### 2.1 Market Opportunity

The global pregnancy tracking and postpartum care apps market is valued at approximately **$356M in 2025**, growing at **18.5% CAGR** to $1.94B by 2035. North America holds a 38.5% share, making it the dominant market. Asia-Pacific is the fastest-growing region.

### 2.2 Competitive Landscape

| App | MAU / Scale | Strengths | Key Weaknesses |
|---|---|---|---|
| **Flo** | 77M active users | Largest content library, AI chatbot, comprehensive tracking | FTC privacy settlement ($59.5M), data sharing history |
| **What to Expect** | 15M+ parents | Medically reviewed editorial, brand trust | Community-only differentiation, limited tracking depth |
| **BabyCenter** | 400M+ lifetime users | Free, strong Birth Clubs community | Outdated UI, data privacy concerns |
| **Ovia** | Mid-tier | 40+ symptom options, Apple Health sync | Being phased out in 2026; $150/year price point |
| **The Bump** | Mid-tier | Clean design | Privacy concerns flagged |

### 2.3 Market Gap — NewLifeJournal's Opening

- **Ovia is shutting down its standalone app in 2026** — creating direct migration opportunity.
- No major app combines pregnancy-to-baby continuity in a single, seamless journey.
- Privacy concerns plague the top players (Flo's FTC settlement is widely known among health-conscious users).
- The $150/year price gap between quality (Ovia) and free-but-compromised (BabyCenter) is wide.

---

## 3. Target Users & Personas

### Primary Persona — "Maya, First-Time Mom"

> **Age:** 28 | **Background:** Working professional, tech-comfortable | **Location:** Urban, US/India

- 11–16 weeks pregnant, recently confirmed via scan
- Uses her phone as her primary health management device
- Anxious about "doing things right" but overwhelmed by information overload
- Does not want her health data sold to advertisers
- Wants one app, not five, to track her journey through birth and beyond

**Core Jobs to be Done:**
1. Know what's happening to her body and baby each week
2. Log symptoms and visits so she doesn't forget details before appointments
3. Get trustworthy answers to pregnancy questions at 2am without judgment
4. See her full journey as a meaningful story, not a spreadsheet

### Secondary Persona — "Priya, Experienced Mom"

> **Age:** 33 | **Second pregnancy** | Wants efficiency, not hand-holding

- Knows the basics; wants quick logging, not tutorial flows
- Values hospital-visit records because her doctor asks for them
- Plans to use the baby tracker after delivery — continuity matters

### Out of Scope for v1.0

- Partners/fathers as co-users (planned v2)
- High-risk pregnancy clinical workflows
- Healthcare provider integration

---

## 4. Problem Statement

**For expectant mothers**, existing apps force a choice between **depth** (Ovia, expensive/shutting down) or **free with privacy trade-offs** (Flo, BabyCenter). No app seamlessly continues the tracking journey from pregnancy into early parenthood without requiring a new product. Most apps also treat users as data sources rather than people.

**NewLifeJournal solves this by:**
1. Delivering comprehensive pregnancy tracking with genuine privacy by default
2. Continuing into baby tracking with a single account and shared history
3. Providing AI-assisted guidance that feels personal, not clinical
4. Building the experience around emotional milestones, not just medical data

---

## 5. Product Vision & Positioning

**Vision:** The most personal pregnancy and parenting companion — from first heartbeat to first steps.

**Tagline:** *Your journey. Your journal.*

**Core Differentiators for v1.0:**
- **Privacy first** — no third-party data selling, clear privacy policy, no ads
- **Dual-mode continuity** — one app, one account, pregnancy → baby
- **AI chat that knows your journey** — context-aware responses using the user's own data
- **Emotional design** — milestone framing, not just medical logging

---

## 6. Feature Inventory — Current State vs. Launch Requirements

### Legend
- ✅ Built and working
- 🔧 Built but needs polish/fixes
- 🚧 Scaffolded, not complete
- ❌ Not built, required for launch
- 🔮 Post-launch roadmap

| # | Feature | Status | Priority | Notes |
|---|---|---|---|---|
| **Authentication** | | | | |
| F01 | Google Sign-In | ✅ | P0 | Working |
| F02 | Welcome / Splash screen | 🔧 | P0 | Needs brand polish |
| F03 | Sign-out + account deletion | ❌ | P0 | Required for App Store |
| **Onboarding** | | | | |
| F04 | Mode selection (Pregnancy / Baby) | ✅ | P0 | `choose-mode.tsx` exists |
| F05 | Pregnancy setup form | ✅ | P0 | Working |
| F06 | Baby setup form | ✅ | P0 | Working |
| F07 | Pregnancy → Baby transition flow | 🚧 | P0 | `transitionedToBabyId` in data model, UI incomplete |
| **Pregnancy Tracking** | | | | |
| F08 | Weekly home screen (baby size, development) | ✅ | P0 | Working |
| F09 | Hospital visits tracker | ✅ | P0 | Working |
| F10 | Symptoms logger | ✅ | P0 | Working |
| F11 | Timeline view with filters | ✅ | P0 | Working |
| F12 | Milestone logging (user-created) | 🔧 | P1 | Data model exists, UI needs completion |
| F13 | Kick counter | ❌ | P1 | Research shows high user demand |
| F14 | Contraction timer | ❌ | P1 | High demand in late pregnancy |
| F15 | Weight tracking with trend view | ❌ | P1 | Basic weight field exists on visits |
| **Baby Tracking** | | | | |
| F16 | Baby home screen | 🚧 | P0 | `(baby)/home.tsx` scaffolded |
| F17 | Feeding log (breast / bottle / solid) | ❌ | P0 | Data types defined, no UI |
| F18 | Diaper log | ❌ | P0 | Data types defined, no UI |
| F19 | Sleep tracker | ❌ | P0 | Data types defined, no UI |
| F20 | Growth records (weight / height / head circumference) | ❌ | P1 | Data types defined, no UI |
| F21 | Vaccine & health events log | ❌ | P1 | Data types defined, no UI |
| F22 | Baby activity timeline | ❌ | P0 | `BabyTimeline` type defined, no UI |
| **AI Chat** | | | | |
| F23 | Multi-provider AI chat | ✅ | P0 | Working (OpenAI, Anthropic, Google) |
| F24 | Pregnancy context injection | ✅ | P0 | Working |
| F25 | Chat history persistence | 🔧 | P1 | `chatbotService.ts` exists, verify persistence |
| F26 | Suggested questions / prompts | ❌ | P1 | Improves first-use experience |
| **Community** | | | | |
| F27 | Community screen | 🚧 | P1 | `community.tsx` exists, `communityService.ts` exists — completeness unknown |
| **Notifications** | | | | |
| F28 | Push notification infrastructure | ❌ | P1 | Required for engagement |
| F29 | Weekly update notifications | ❌ | P1 | "You're now Week X" |
| F30 | Appointment reminders | ❌ | P2 | From `nextVisitDate` on hospital visits |
| **Profile & Settings** | | | | |
| F31 | User profile screen | ❌ | P0 | Required for App Store |
| F32 | Privacy & data settings | ❌ | P0 | Required for App Store + user trust |
| F33 | App settings (theme, notification prefs) | ❌ | P1 | |
| **Polish & Infrastructure** | | | | |
| F34 | Remove Admin screen from production build | ❌ | P0 | Admin tab must not appear in production |
| F35 | Error states & empty states for all screens | 🔧 | P0 | |
| F36 | Offline graceful degradation | ❌ | P1 | |
| F37 | App icon, splash screen, store assets | ❌ | P0 | Required for App Store submission |
| F38 | Privacy policy + Terms of Service | ❌ | P0 | Required for App Store |

---

## 7. Feature Specifications

### F03 — Account Deletion

**Why:** Apple App Store review guidelines require in-app account deletion.

**Behavior:**
1. User accesses Profile → Account → Delete Account
2. App shows confirmation modal: "This will permanently delete all your data including pregnancy records, visits, symptoms, and baby logs. This cannot be undone."
3. User must type "DELETE" to confirm
4. On confirm: delete all Firestore documents under `users/{userId}`, revoke Firebase Auth, sign out
5. Show success screen: "Your account and all data have been deleted."

**Image description for design:** *A clean modal overlay on a light teal background. Top area shows a red warning icon (circle with exclamation). Title "Delete Account" in bold dark text. Body text explains the deletion. A text input field with placeholder "Type DELETE to confirm". Two buttons: grey "Cancel" and red "Delete Account". Destructive action is clearly styled differently.*

---

### F07 — Pregnancy → Baby Transition Flow

**Why:** This is NewLifeJournal's strongest differentiator. No competitor does this seamlessly.

**Trigger:** User taps "My baby has arrived!" from the home screen (shown in Week 37+).

**Flow:**
1. Celebration screen: confetti animation, "Congratulations! 🎉" heading
2. Form: Baby's name (pre-filled from pregnancy `babyName`), birth date, birth weight, birth height, gender (optional)
3. Confirm → creates `Baby` document with `fromPregnancyId` linked, sets `Pregnancy.status = 'completed'`, sets `Pregnancy.transitionedToBabyId`
4. App mode switches to Baby tracking; pregnancy data is preserved and accessible as "Pregnancy History" in profile
5. First baby home screen shows: "Welcome, [Baby Name]! Day 1 of your journey."

**Data linking:** All pregnancy timeline events remain linked and accessible from baby profile as "Before you were born" section.

**Image description for design:** *Full-screen celebration view. Pastel teal-to-white gradient background with animated confetti in teal, gold, and soft pink. Large centered emoji 🎉. Bold title "Your baby has arrived!" Subtitle "Let's set up [BabyName]'s profile." Large rounded white card below with form fields. Primary teal CTA button at bottom.*

---

### F13 — Kick Counter

**Why:** One of the most-requested features in user research; standard in every top competitor; critical for late pregnancy safety awareness.

**Behavior:**
- Available from Week 20 onwards (home screen widget + standalone view)
- Single large tap target button: "TAP when baby kicks"
- Counts kicks in a session; sessions auto-labeled with date/time
- Shows: kicks in current session, time of first kick, elapsed time
- Sessions saved to Firestore under `pregnancyId/kickSessions`
- Summary view: kicks per day over last 7 days (simple bar chart)
- "Normal range" contextual tip: "Doctors often recommend 10 kicks in 2 hours. You counted X kicks."

**Image description for design:** *Full screen with soft teal background. Top shows "Kick Counter" title and date. Large circular button in center (90px diameter) in teal with subtle shadow, label "TAP" inside. Below: "12 kicks • 8 min 42 sec". Small text: "Start time: 9:04 PM". Bottom card shows a 7-day horizontal bar chart labeled "Kicks per day" with teal bars. Subtle warning note in amber if fewer than 10 in the last session.*

---

### F14 — Contraction Timer

**Why:** Critical for labor preparation (typically Week 37–40). Highly anxiety-reducing tool.

**Behavior:**
- Tap "Start" to begin contraction, "Stop" to end it
- Displays: duration of current contraction, time since last contraction (interval), contraction count in session
- Auto-calculates average duration and interval across last 5 contractions
- Alert logic: if contractions are ≤5 min apart, ≥1 min duration, for ≥1 hour → surface "Consider calling your doctor" banner (based on 5-1-1 rule)
- Sessions saved locally (can persist to Firestore)
- Share button: generates a readable summary ("Last 10 contractions: avg 58s duration, avg 4m 12s apart") to copy/share with doctor or partner

**Image description for design:** *Dark teal header "Contraction Timer". Large central status card: currently shows either a pulsing "STOP" button (red, when timing) or a "START" button (teal, when waiting). Below the button: "Duration: 0:58" and "Interval: 4:12". Card below shows a history list of last 5 contractions as row items with duration and interval. At very bottom, amber banner appears when 5-1-1 rule triggered: "⚠️ Contractions are close together. Consider calling your doctor."*

---

### F17–F19 — Baby Activity Logging (Feeding, Diaper, Sleep)

**Why:** These are the P0 features of the baby mode. Without them, baby mode cannot launch.

#### F17 — Feeding Log

**Fields:** Feed type (breast left / breast right / both / bottle / solid), Amount (ml or oz, optional for breast), Duration (auto-timed or manual), Notes

**Quick-log UX:** From baby home screen, tap "Feed" → bottom sheet appears → select type → tap "Start" to begin timer or enter manually → Save.

#### F18 — Diaper Log

**Fields:** Type (wet / dirty / both), Color (normal / yellow / green / other), Notes (optional)

**Quick-log UX:** From baby home screen, tap "Diaper" → bottom sheet appears → select type → Save. 5-second interaction max.

#### F19 — Sleep Tracker

**Fields:** Start time (default: now), End time (tap to stop or enter manually), Notes

**Behavior:** Can run as a live timer with optional lock-screen widget (iOS). Shows daily sleep total.

**Image description for design (Baby Home Quick-Log Bar):** *Horizontal row of 4 rounded pill buttons below the baby summary card: "🍼 Feed", "💧 Diaper", "😴 Sleep", "📏 Growth". Teal outline style buttons with icon + label. Tapping any opens a modal bottom sheet (slides up from bottom with a drag handle). Sheet has a large title, relevant quick-input fields, and a prominent teal "Save" button.*

---

### F22 — Baby Activity Timeline

**Why:** Mirrors the pregnancy timeline; gives parents a unified view of their day/week.

**Behavior:**
- Grouped by day (today, yesterday, date)
- Filter tabs: All / Feeding / Diaper / Sleep / Health
- Each entry card shows: icon, type, timestamp, key stat (e.g., "Left breast — 14 min", "Wet diaper", "Slept 2h 14m")
- Tap to expand/edit
- Day summary header: "Today — 6 feeds, 4 diapers, 8h 20m sleep"

---

### F26 — Suggested AI Chat Prompts

**Why:** First-use drop-off; users open chat but don't know what to ask.

**Behavior:**
- When chat history is empty, show 4 suggested question chips below the input:
  - "What's my baby doing at Week [X]?" *(dynamic, uses current week)*
  - "Is [most recent symptom] normal?"
  - "What should I pack in my hospital bag?"
  - "What foods should I avoid?"
- Tapping a chip populates the input and immediately sends
- Chips disappear once first message is sent

---

### F31 — User Profile Screen

**Sections:**
1. **Profile header** — Avatar (from Google account), name, email
2. **Active tracking** — Current mode (Pregnancy / Baby), quick stats (current week or baby age)
3. **My pregnancies** — List of past pregnancies (readonly, tap to view history)
4. **My babies** — Active and past baby profiles
5. **Account** — Sign out, Delete account, Privacy settings link
6. **App info** — Version number, Privacy Policy link, Terms of Service link

---

### F32 — Privacy & Data Settings

**Sections:**
- Data storage info: "Your data is stored securely in Firebase and never sold to third parties."
- Export my data (v2 — mark as "Coming soon")
- Delete my data → links to F03 flow
- Privacy policy (webview or link)
- Crash reporting opt-out toggle

**Image description for design:** *Clean settings-style list view on white background. Each row has a left icon, label, and right chevron or toggle. Privacy-related rows use a shield icon in teal. Destructive "Delete Account" row at the bottom uses red text.*

---

### F34 — Remove Admin Screen from Production Build

**Requirement:** The Admin tab (`admin.tsx`) must not be accessible in production builds.

**Implementation:** Gate the admin tab behind an environment variable flag (`EXPO_PUBLIC_SHOW_ADMIN=true`). The tab should only render when the flag is set and the app is running in development mode. In production EAS builds, this flag is absent and the tab is excluded from the navigation layout entirely.

---

## 8. Non-Functional Requirements

### 8.1 Performance

- App cold start (first meaningful paint): ≤ 2.5 seconds on mid-range Android
- Timeline screen load (with 50+ events): ≤ 1.5 seconds
- AI chat first response token: ≤ 3 seconds on a standard connection
- All animations must run at 60fps; use `useNativeDriver: true` throughout

### 8.2 Privacy & Security

- No analytics SDKs that share PII with ad networks (no Facebook SDK, no Google Analytics for Firebase with ad targeting)
- All data stored under authenticated user path (`users/{userId}/...`), enforced by Firestore security rules
- API keys for AI providers must never be exposed in client bundles in production — proxy through a Firebase Cloud Function or backend service
- Privacy policy must cover: data collected, retention period, no-sale clause, deletion rights
- No crash reporting without opt-in (or use a privacy-preserving option)

### 8.3 Accessibility

- All tap targets ≥ 44×44pt
- Color is never the sole means of conveying information (severity labels must include text, not just color dots)
- Support Dynamic Type on iOS (respect system font size)
- VoiceOver / TalkBack labels on all interactive elements

### 8.4 Reliability

- Firestore data must never be silently lost; all write operations must have error handling with user feedback
- Implement Firestore offline persistence (enable `enableIndexedDbPersistence` or equivalent) so users can log entries without connectivity
- All forms must restore state if app is backgrounded mid-entry (use local state persistence)

### 8.5 App Store Requirements

- iOS: minimum deployment target iOS 16.0
- Android: minimum SDK 26 (Android 8.0)
- App must pass App Store Review Guidelines 5.1.1 (data collection), 5.1.2 (data use), and 5.1.5 (account deletion)
- All required App Store metadata: description, screenshots (6.5" iPhone, 5.5" iPhone, 12.9" iPad), keywords, privacy nutrition label

---

## 9. Design System & UI Guidelines

### 9.1 Color Palette

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#81bec1` | Primary buttons, active states, brand accent |
| `primary-light` | `#E0F2F3` | Screen backgrounds, card fills |
| `primary-dark` | `#5a9ea1` | Pressed states, headers |
| `success` | `#4CAF50` | Hospital visits, positive states |
| `warning` | `#FF9800` | Symptoms, secondary actions |
| `danger` | `#F44336` | Severity 5, destructive actions |
| `gold` | `#FFD700` | Milestones |
| `text-primary` | `#1a1a1a` | Body text |
| `text-secondary` | `#666666` | Subtitles, hints |
| `surface` | `#FFFFFF` | Card backgrounds |

### 9.2 Typography

- **Display / Hero:** 32px, Bold, `#1a1a1a`
- **Title:** 20px, SemiBold, `#1a1a1a`
- **Body:** 16px, Regular, `#1a1a1a`
- **Caption:** 14px, Regular, `#666666`
- **Micro:** 12px, Regular, `#999999`

### 9.3 Spacing & Radius

- Base unit: 8px
- Card border radius: 16–20px
- Button border radius: 12px (standard), 24px (pill)
- Screen horizontal padding: 24px

### 9.4 Animation Standards

- Modal slide-up: 300ms, ease-out
- Dropdown open: 300ms, slide + fade in parallel
- Confetti/celebration: use `react-native-confetti-cannon` or equivalent
- Avoid layout animations without `useNativeDriver`

### 9.5 App Icon

**Image description for design:** *Rounded square icon (1024×1024px). Background: soft gradient from `#E0F2F3` (top-left) to `#81bec1` (bottom-right). Centered: a stylized open book/journal shape in white with a small heart or leaf motif emerging from the pages. Clean, modern, friendly. No text on the icon. The overall feel should be warm, feminine but not pink — teal as the brand color.*

### 9.6 Onboarding Splash Screen

**Image description for design:** *Full-screen splash. Background is a soft gradient from white at top to `#E0F2F3` at bottom. Centered vertically: the app icon (logo mark only, no badge frame), below it the app name "NewLifeJournal" in 28px bold teal `#81bec1`, and below that the tagline "Your journey. Your journal." in 16px regular grey. Bottom 20% shows a subtle illustrated scene: a pregnant woman silhouette sitting by a window, journaling — soft line art style in teal tones.*

---

## 10. Analytics & Success Metrics

### 10.1 Key Launch Metrics (First 90 Days)

| Metric | Target | Measurement |
|---|---|---|
| Day 7 Retention | ≥ 40% | Users returning on day 7 after install |
| Day 30 Retention | ≥ 25% | Standard health app benchmark |
| Onboarding Completion Rate | ≥ 80% | Users completing setup after sign-in |
| Pregnancy → Baby Transition Rate | ≥ 60% | Users who transition within the app vs. churning |
| AI Chat Engagement | ≥ 1 message/week per active user | Indicates value delivery |
| Weekly Log (any event) | ≥ 3 logs/week per active user | Core habit formation |
| App Store Rating | ≥ 4.5 stars | Prompt 3 days after first log entry |

### 10.2 Instrumentation Requirements

Implement event tracking (privacy-preserving, no PII) for:
- `onboarding_started`, `onboarding_completed`, `onboarding_mode_selected`
- `pregnancy_created`, `baby_created`, `transition_completed`
- `visit_logged`, `symptom_logged`, `kick_counted`, `contraction_timed`
- `chat_message_sent`, `suggested_prompt_tapped`
- `timeline_filtered`, `week_selected`
- `app_opened` (for retention calculation)

Use Firebase Analytics with `allow_ad_personalization_signals = false`.

---

## 11. Launch Readiness Checklist

### Engineering Gate
- [ ] F03 — Account deletion implemented and tested
- [ ] F07 — Pregnancy-to-Baby transition flow complete
- [ ] F16–F22 — Baby mode core features (feeding, diaper, sleep, timeline) complete
- [ ] F31–F32 — Profile and privacy settings screens
- [ ] F34 — Admin screen removed from production builds
- [ ] AI API keys proxied through backend (not exposed in client)
- [ ] Firestore offline persistence enabled
- [ ] Firestore security rules audited and locked down
- [ ] All screens have empty states and error states
- [ ] All animations use `useNativeDriver: true`

### Design Gate
- [ ] App icon (1024×1024px) + all required sizes generated
- [ ] Splash screen asset
- [ ] App Store screenshots (all required device sizes)
- [ ] All image assets exported @1x / @2x / @3x

### Legal/Compliance Gate
- [ ] Privacy policy published and linked in-app
- [ ] Terms of service published and linked in-app
- [ ] Apple privacy nutrition label completed
- [ ] Google Play data safety section completed
- [ ] Account deletion flow verified by App Store guidelines

### QA Gate
- [ ] End-to-end test: onboarding → pregnancy setup → log visit → log symptom → view timeline → chat → transition to baby → log feed
- [ ] Tested on iOS 16+ (iPhone SE, iPhone 14, iPhone 15 Pro Max)
- [ ] Tested on Android API 26+ (Pixel 6, Samsung Galaxy S22)
- [ ] Network failure handling verified (airplane mode testing)
- [ ] Accessibility audit (VoiceOver, Dynamic Type)

---

## 12. Future Roadmap (Post v1.0)

### v1.1 — Engagement & Retention (Q3 2026)
- Push notifications for weekly updates and appointment reminders (F28–F30)
- Suggested AI chat prompts (F26)
- Blood pressure trend charts on visits
- Weight tracking chart across pregnancy weeks

### v1.2 — Partner Mode (Q4 2026)
- Invite a partner to view (read-only) the pregnancy/baby profile
- Push shared milestones
- Partner-specific weekly update (what to expect, how to help)

### v2.0 — Community & Content (Q1 2027)
- Birth Club groups (matched by due date month) — professionally moderated
- Curated, medically reviewed article library (week-by-week)
- Photo memories / ultrasound photo storage
- Data export as PDF birth story / keepsake

### v2.1 — Advanced Tracking (Q2 2027)
- Apple Health / Google Fit sync (weight, heart rate)
- Mood journaling with weekly reflections
- Birth plan builder
- Postpartum mode (6-week checkup, mental health tracking)

### v3.0 — Platform Expansion (2027+)
- Toddler tracking mode (milestones, developmental charts)
- Multi-pregnancy support (subsequent pregnancies)
- Healthcare provider portal / data sharing with consent
- Internationalization: Spanish, Hindi, Portuguese priority

---

*Document prepared by Product Management, NewLifeJournal. For questions or clarifications, contact the PM before sprint planning.*
