# QA test plan — v1.0 launch gate (C6)

Run on real devices with a **production-profile EAS build** pointed at a staging or production Firebase project with the `dev` backend deployed. It covers PRD §11 (QA gate) and §8 (non-functional requirements).

**Pass rule:** every **P0** case passes on every device in the matrix. P1 failures need a written decision (fix now, or ship and fix in 1.0.x).

## Device matrix (PRD §11)

| Device | OS | Why |
|---|---|---|
| iPhone SE (2nd/3rd gen) | iOS 16.4–17 (lowest supported is 16.4) | Small screen, oldest supported iOS |
| iPhone 14 | latest iOS | Mainstream |
| iPhone 15 Pro Max | latest iOS | Large screen, Dynamic Island |
| iPad (any, 13″ if possible) | latest iPadOS | Only if `supportsTablet` stays true |
| Pixel 6 | Android 14+ | Reference Android |
| Samsung Galaxy S22 | Android 13+ | One UI quirks (keyboard, notifications) |
| Any Android 8.0 (API 26) device or emulator | Android 8 | Lowest supported Android |

**Accounts:** see [TESTING_AND_PLANS.md](TESTING_AND_PLANS.md#2-suggested-test-accounts).

- Free.
- Plus (`setPlan.js … plus`).
- Moderator.
- A second Free account for Community.
- Store sandbox testers for purchases.

## Test cases

Record pass/fail, device and build number for each. The **E2E** column points to the automated agent flow where one exists (`e2e/flows/`).

### Accounts & onboarding

| ID | Pri | Steps | Expected | E2E |
|---|---|---|---|---|
| A1 | P0 | Create account with email/password | Lands on "What are you tracking?"; verification email arrives | |
| A2 | P0 | Sign in with Google (iOS, Android release build) | Signs in; no `DEVELOPER_ERROR` on Android (release SHA-1 registered) | |
| A3 | P0 | Forgot password | Reset email arrives; new password works | |
| A4 | P0 | Choose *My pregnancy*, set a due date | Home shows the right week and trimester | |
| A5 | P0 | Choose *My baby*, add details | Baby Home shows "Welcome, [name]! Day N" | |
| A6 | P0 | Kill and reopen the app | Stays signed in; opens on the right mode's Home | |
| A7 | P0 | Delete account: type DELETE | Confirmation screen; can't sign in with the old credentials; data gone from Firestore and Storage | |
| A8 | P1 | Delete account after being signed in > 15 min | Asks to sign in again first | |

### Pregnancy

| ID | Pri | Steps | Expected | E2E |
|---|---|---|---|---|
| P1 | P0 | Log a symptom (Nausea, severity 3, note) | Appears in Timeline under the right week with severity label | `log_symptom.yaml` |
| P2 | P0 | Add a visit with weight, BP and next appointment | In Timeline; "Next appointment" card; reminder scheduled for 9am the day before | `add_visit.yaml` |
| P3 | P0 | Edit and delete an entry from Timeline | Changes saved / removed | |
| P4 | P0 | Timeline filters and Jump to week | Correct entries; scrolls to the week | `timeline_filter.yaml` |
| P5 | P0 | Edit due date | Entries move to their new weeks | |
| P6 | P1 | Kick counter at week ≥ 20: count 12, kill the app mid-session, reopen | Session restored with the same count; save shows in history and the 7-day chart | |
| P7 | P1 | Kick session with < 10 movements | Amber "moving less than usual" note | |
| P8 | P1 | Contraction timer: kill the app mid-contraction, reopen | Session and the running contraction restored | |
| P9 | P1 | Contractions every 5 min, 60 s long, for ≥ 1 hour (use a test build with a fast clock, or real time) | "Time to call" appears only after the full hour | |
| P10 | P1 | Contraction "Share summary" | Share sheet with "Last N contractions: avg … long, avg … apart" | |
| P11 | P1 | Charts, Birth plan, Export PDF, Share timeline (Plus account) | Work; free account sees the preview and paywall | |
| P12 | P1 | Checklist add/check/delete custom item | Persists | |

### Baby has arrived & baby mode

| ID | Pri | Steps | Expected | E2E |
|---|---|---|---|---|
| B1 | P0 | Week ≥ 37 → "Has your baby arrived?" → fill form → Welcome | Confetti; baby mode Home "Day 1"; Tools shows "Before you were born" with the pregnancy journal read-only | `baby_transition.yaml` |
| B2 | P0 | Log a diaper | ≤ 5 s from tap to saved; today's count goes up | `baby_transition.yaml` |
| B3 | P0 | Feed: bottle 4 oz, past feed | Saved as 118 ml; shows in Recent and Timeline | |
| B4 | P0 | Feed timer: start, kill the app, reopen after 2 min, Stop | Clock continues (not reset); saved with the right duration | |
| B5 | P0 | Sleep timer across midnight | Day summaries split the sleep at midnight | `baby_sleep_timer.yaml` |
| B6 | P0 | Baby Timeline filters | Feeds / Diapers / Sleep / Health show the right entries | |
| B7 | P1 | Growth: add weight twice | Chart from the birth weight; delta pill | |
| B8 | P1 | Health: vaccine with next dose | Appears under "Coming up" | |
| B9 | P1 | You → switch to pregnancy journal / Add another baby / switch babies | Correct journal each time | |
| B10 | P1 | Undo "Baby has arrived" from the pregnancy profile | Pregnancy active again; baby profile kept | |

### AI assistant

| ID | Pri | Steps | Expected |
|---|---|---|---|
| C1 | P0 | First open of Ask | Consent screen; nothing sent before Agree |
| C2 | P0 | Ask a question (pregnancy mode) | Answer mentions the current week; arrives within the §8.1 target (see below) |
| C3 | P0 | "I have heavy bleeding" / "baby has blue lips" (baby mode) | Answer **starts** with the urgent-care notice |
| C4 | P0 | Free account: 16th message in a month | Clear limit message with Upgrade |
| C5 | P1 | Attach a photo from the library (iOS HEIC) | Sent and answered (no "invalid image" error) |
| C6 | P1 | Suggested questions | "What's my baby doing at week N?" and "Is [last symptom] normal?" |
| C7 | P1 | Baby mode question | Answer uses the baby's age and recent feeds/sleep |

### Plus & purchases (sandbox)

| ID | Pri | Steps | Expected |
|---|---|---|---|
| S1 | P0 | Buy Plus with a sandbox account | Plus unlocks immediately; `users/{uid}.subscription` written |
| S2 | P0 | Restore purchases on a second device | Plus restored |
| S3 | P1 | Let the sandbox subscription lapse | Back to Free after expiry (webhook or next app open) |

### Reminders

| ID | Pri | Steps | Expected |
|---|---|---|---|
| N1 | P1 | Allow notifications, add a visit with a next appointment tomorrow+1 | Reminder at 9am the day before |
| N2 | P1 | Weekly updates on | "You're now week N" arrives at 9am when the week changes |
| N3 | P1 | Sign out | No more reminders on that device |

### Community

| ID | Pri | Steps | Expected |
|---|---|---|---|
| M1 | P1 | Post, comment, like (Plus) | Visible to the second account |
| M2 | P1 | Report a post from the second account | Hidden for the reporter; appears in the moderator's queue |
| M3 | P1 | Moderator removes it | Gone for everyone |
| M4 | P1 | Block / unblock | Author's posts hidden / shown |

### Privacy & settings

| ID | Pri | Steps | Expected |
|---|---|---|---|
| R1 | P0 | Fresh install | "Share anonymous usage" and "Send crash reports" both off; no Analytics or Crashlytics traffic (check with Firebase DebugView / Crashlytics console) |
| R2 | P1 | Turn both on, then trigger a test crash | Event in DebugView; crash in Crashlytics, **without** a user id |
| R3 | P1 | Privacy policy / Terms links (sign-in, AI consent, paywall, Profile) | Open the hosted pages |
| R4 | P1 | Dark mode (System/Light/Dark) on every main screen | Readable; no light flashes |

### Offline & resilience (PRD §8.4)

| ID | Pri | Steps | Expected |
|---|---|---|---|
| O1 | P0 | Airplane mode → log a symptom and a feed → back online | "You're offline" strip shows; entries sync when back online; nothing lost |
| O2 | P0 | Airplane mode → open Home, Timeline, baby Home | Cached data shown; no endless spinners; week content still shown |
| O3 | P1 | Start a new visit, type half of it, kill the app, reopen Visits | Form reopens with what was typed (same for symptoms, and feeds on baby Home) |
| O4 | P1 | Ask while offline | Clear error; message can be resent |

### Accessibility (PRD §8.3)

| ID | Pri | Steps | Expected |
|---|---|---|---|
| X1 | P0 | VoiceOver / TalkBack through sign-in, Home, logging a symptom, a feed, Ask | Every control announced with a sensible label; order makes sense |
| X2 | P1 | Largest Dynamic Type / font size | Text grows; nothing important clipped or overlapping |
| X3 | P1 | Tap targets | ≥ 44×44 pt on all buttons (check the small header icons) |
| X4 | P1 | Severity, diaper colour, etc. | Never conveyed by colour alone (labels present) |

## Performance (PRD §8.1)

Measure on the **Pixel 6** and the **iPhone SE**, release build, warm network. Repeat each measurement 5 times and take the median.

| Target | How to measure | Pass |
|---|---|---|
| Cold start ≤ 2.5 s to first meaningful paint | Screen-record from tapping the icon to Home's week card | ≤ 2.5 s |
| Timeline with 50+ events ≤ 1.5 s | Seed 50+ entries; switch to the Timeline tab and time until rows show | ≤ 1.5 s |
| AI first response ≤ 3 s | Answers aren't streamed, so this is the time to the full answer. Time from Send to the answer appearing | Record the value; > 3 s is expected without streaming. Client decides (§3 of the v1 plan) |
| 60 fps | Android "Profile GPU rendering" / Xcode Instruments while scrolling Timeline and opening sheets | No sustained jank |

Firebase Performance (opt-in) also records the `ai_chat_request` trace in production.

## Sign-off

| Device | Build | P0 pass | P1 pass | Tester | Date |
|---|---|---|---|---|---|
| | | | | | |
