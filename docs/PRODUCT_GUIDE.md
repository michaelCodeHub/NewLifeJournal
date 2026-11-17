# Bloom & Bump — product guide

A plain-language guide to what the app does, for the client, testers, support and store listings. It describes the `dev` branch (v1, November 2026).

## What it is

Bloom & Bump is a private journal that goes from pregnancy into the first years with a baby, in one app and one account.

- **Pregnancy:** shows how the baby is growing week by week, keeps a record of appointments and symptoms, and has simple tools for the last weeks (kick counter, contraction timer, hospital-bag checklist, birth plan).
- **After the birth:** a baby journal for feeds, diapers, sleep, growth and vaccines.
- **AI assistant:** answers questions using the user's own journal.

- **Platforms:** iPhone, Android (and a web version used for testing).
- **v1 scope:** pregnancy mode and baby mode (see [Baby mode](#baby-mode)). Status against the client's spec: [V1_RELEASE_PLAN.md](V1_RELEASE_PLAN.md).
- **Privacy promise:** the journal is visible only to its owner. Data is never sold or shared. Analytics are off unless the user turns them on.

## Free vs Plus

| | Free | Plus |
|---|---|---|
| Weekly baby & body updates | ✓ | ✓ |
| Timeline, symptoms, hospital visits, milestones | ✓ | ✓ |
| Kick counter, contraction timer | ✓ | ✓ |
| Baby checklist, reminders | ✓ | ✓ |
| Baby mode: feeds, diapers, sleep, growth, health, baby timeline | ✓ | ✓ |
| AI assistant | 15 questions / month | Unlimited* |
| Weight & blood-pressure charts | – | ✓ |
| Birth plan builder | – | ✓ |
| PDF report for your care team | – | ✓ |
| Share timeline | – | ✓ |
| Community | – | ✓ |

\* Everyone has fair-use limits: 6 questions per minute and 150 per day.

Plus is sold as an in-app subscription (plans set up in the App Store / Google Play and RevenueCat). Free users see a faded preview of each Plus feature with a "See Plus" button.

## Getting started

1. **Sign in** with Google, or with email and password (with "Forgot password?").
2. **Choose what you're tracking:** *My pregnancy* or *My baby*.
3. **Pregnancy:** your name, due date (the app shows "That's week N · Nth trimester" as you pick), and optionally baby's name, hospital, doctor and their phone. Tap **Start my journal**.
4. **Baby:** the baby's name, birth date, and optionally birth weight, length and gender. Tap **Start my baby's journal**.

The current week is always worked out from the due date, so it updates by itself.

## The five tabs

### Home
- Greeting and a **week card**: "Week N of 40", trimester, days to go, baby illustration, and baby's size, length and weight. Tap it for the **growth gallery**, which lets you browse every week.
- **Log today:** one-tap shortcuts that follow the pregnancy: symptom and visit always, kicks from week 20, contractions from week 28 (a milestone shortcut before that).
- **Your baby this week:** development highlights. "More" opens the week in detail with four tabs: Baby, You (body changes), Tips, and Care (appointments and tests to expect).
- After the due date: "Has your baby arrived?"

### Timeline
- Every visit, symptom and milestone in one list, grouped by pregnancy week, newest first.
- Filter by All, Visits or Symptoms. "Jump to week" goes straight to a week.
- **+** adds a symptom, a hospital visit or a milestone (for example "First kick" or "Baby shower").
- Tap an entry to edit it. Press and hold to edit or delete it.

### Tools
All features in one place:
- **Track:** Symptoms, Hospital visits, Kick counter, Contraction timer, Health charts (Plus)
- **Prepare:** Baby checklist, Birth plan (Plus), Reminders
- **Share:** Export report (Plus), Share timeline (Plus), Community (Plus)

### Ask (AI assistant)
- The first time, a short screen explains what's shared with the AI provider (your question, your pregnancy week and recent journal entries), that it's never sold or used for ads, and that **the assistant is not a doctor**.
- Suggested questions start with "What's my baby doing at week N?" and, if you've logged a symptom, "Is [that symptom] normal?", then questions for your trimester.
- You can attach up to 3 photos (camera or library). PDFs can be attached for your own records, but the AI only reads photos.
- If a question mentions an emergency sign (heavy bleeding, waters breaking, baby moving less, severe headache or vision changes, fever, chest pain, thoughts of self-harm…), the answer always starts with advice to call the emergency number or maternity unit **now**.
- Free users see how many of their 15 monthly questions are left. The count resets on the 1st of each month.
- The bin icon clears the chat history. This does not give back used questions.

### You (Profile)
- Name, email, and a Free or Plus badge, with an upgrade card for free users.
- **Pregnancy:** current week, due date, days to go, baby, doctor and hospital, with **Edit**. If you change the due date, all entries move to their correct weeks.
- **Baby has arrived:** see below.
- **Your babies** (open a baby's journal) and **Past pregnancies** (read-only journals).
- **Appearance:** System, Light or Dark.
- Reminders, Export my data, Contact support.
- **Privacy:** "Share anonymous usage" and "Send crash reports" (both off by default), Blocked accounts, Privacy policy, Terms.
- **Sign out** and **Delete account** (type DELETE to confirm).

## Tracking features

**Symptoms.** Pick from Nausea, Fatigue, Headache, Back pain, Leg cramps, Heartburn, Constipation, Mood swings, Swelling, Shortness of breath, or Other (describe it). Rate how strong it was: 1 Mild, 2 Moderate, 3 Noticeable, 4 Severe or 5 Very severe. Add the date and notes. The screen also shows your most-logged symptoms.

**Hospital visits.** The visit types are Checkup, Ultrasound, Blood test, Glucose test, Anatomy scan, First trimester screening, Non-stress test, Emergency visit, and Other. For each visit you can record:
- weight (kg)
- blood pressure (e.g. 120/80)
- notes
- the **next appointment** date, which appears as a "Next appointment" card and can trigger a reminder

**Kick counter.** Tap the button each time the baby moves.

- **During a session:** the goal is 10 movements. The screen shows the time taken, when the session started and when the first movement came.
- **History:** a **Kicks per day** chart for the last 7 days, plus averages for past sessions.
- **Warning:** if the last session had fewer than 10 movements, an amber note reminds you to call your doctor or labour ward if your baby is moving less than usual.
- **Safe to leave:** you can leave the screen or close the app mid-session; it picks up where you left off.

**Contraction timer.** Tap when a contraction starts and again when it ends.

- **During a session:** the timer shows how long each contraction lasts and how far apart they are.
- **"Time to call" alert:** appears when contractions have come every 5 minutes or less, each lasting at least a minute, for a full hour (the 5-1-1 guide).
- **Share summary:** sends something like "Last 10 contractions: avg 58s long, avg 4m 12s apart" to your doctor, midwife or partner. Saved sessions can be shared the same way by tapping them.
- **Safe to leave:** the session survives leaving the screen or closing the app.

**Health charts (Plus).** Weight and blood-pressure trends, built automatically from the visits you've logged.

**Milestones.** Add personal moments to the timeline with a date and a note.

## Preparing for birth

**Baby checklist.** It starts with 29 suggested items across six categories: Nursery, Clothing, Feeding, Health & Safety, Travel and Hospital Bag. Tick items off to see your overall progress. You can add your own items; the suggested items can't be removed.

**Birth plan (Plus).** Choose your preferences in five sections:
- Pain management
- Labour
- Delivery
- After delivery
- Special requests

You can add notes to any section. The plan saves automatically and can be printed or shared.

**Reminders.** There are three, all on by default:
- **Appointment reminder:** 9am the day before each next appointment.
- **Weekly update:** "You're now week N" at 9am on the day each new week starts, with your baby's size that week.
- **Kick-count reminder:** daily at 8pm.

Reminders are set up on the phone itself, as soon as an appointment is saved. They stop when you sign out or after the baby has arrived.

## Sharing

**Export report (Plus).** Creates a PDF "Pregnancy Journal Report" on the phone, with a pregnancy summary and tables of visits, symptoms and milestones, to share with your doctor or midwife. Nothing is uploaded.

**Share timeline (Plus).** Sends a one-off summary of your journey as a text message or a PDF through the phone's share menu. It is a snapshot, not a live link.

## Community (Plus)

- A shared feed for expectant mums. You can write a post (and tag your week), like, comment and search.
- **Safety:**
  - **Report** a post or comment as spam, harassment, medical misinformation or other. It disappears for you straight away.
  - **Block** a person to hide all their posts and comments from you. They aren't told.
  - Manage your blocks in You → Blocked accounts.
- **Moderators** (staff accounts set up by the team) see a Moderation screen with the open reports. For each report they can **Keep** it or **Remove** the post or comment for everyone.

## Baby has arrived

From week 37, Home asks **"Has your baby arrived?"**. You can also go to **You → Baby has arrived** at any time.

1. A celebration screen opens: **Congratulations!**
2. Confirm the baby's name (it's pre-filled if you chose one), birth date, and optionally weight, length and gender.
3. Tap **Welcome [name]**. The app switches to the baby's journal: *"Welcome, [name]! Day 1 of your journey."*

Your pregnancy journal is kept exactly as it was. Open it any time from the baby's **Tools → Before you were born**. "Undo" is still available from the pregnancy profile.

## Baby mode

Baby mode has the same five tabs as pregnancy mode.

**Home**
- The baby's age and day of life.
- Today's feeds, diapers and sleep.
- When the last feed and diaper were.
- One-tap logging: **Feed · Diaper · Sleep · Growth**.

**Feed**
- Breast (left / right / both), bottle or solids.
- Optional amount in ml or oz.
- **Start timer** keeps running even if you close the app; stop it from Home. You can also **log a past feed** with start and end times.

**Diaper**
- Wet, dirty or both, then Save — a few seconds.
- Colour and notes are optional.

**Sleep**
- "Baby is asleep" starts a timer; tap **Woke up** on Home to stop it.
- Past naps can be entered with times.
- Daily sleep totals split overnight sleep at midnight.

**Timeline**
- Everything grouped by day (Today, Yesterday, …), each day with a summary line, e.g. "6 feeds · 4 diapers · 8h 20m sleep".
- Filters: All, Feeds, Diapers, Sleep, Health.
- Tap an entry to edit it; use "…" to delete it.

**Tools**
- **Growth:** weight, length and head circumference, with a trend chart that starts from the birth measurements.
- **Health & vaccines:** vaccines, checkups, illnesses and medicines, with next-dose and follow-up dates under "Coming up".
- **Before you were born:** the pregnancy journal, read-only.
- **Community** (Plus).

**Ask**
- The assistant knows the baby's age and the last 24 hours of feeds, diapers and sleep.
- It can also help with your own recovery.
- If you describe newborn warning signs, the answer always starts by telling you to get urgent help. These include fever under 3 months, blue lips, breathing trouble, floppiness, no wet diapers and refusing feeds.

**You**
- The baby's details (Edit).
- Your other babies.
- A switch back to an active pregnancy, starting a new pregnancy, and adding another baby.

Removing a baby profile (Edit → Remove) deletes everything logged for that baby.

## Your data & privacy

- **Who can see your data:** only you can read your journal. Community posts are visible to other signed-in members.
- **Where it's stored:** in Google Firebase (Cloud Firestore). Chat photos are stored in Firebase Storage.
- **What goes to the AI:** the AI provider receives your question, plus your pregnancy week and recent journal entries (or, in baby mode, your baby's age and recent feeds, diapers, sleep and health entries), but only when you use Ask.
- **Analytics and crash reports:** both are opt-in (You → Privacy: "Share anonymous usage", "Send crash reports") and both are off by default. Neither includes health details or journal content. Nothing is used for advertising.
- **Delete account:** You → Delete account, then type DELETE to confirm. This permanently removes your pregnancy and baby journals, chats, photos, community posts, comments and likes, and your login, then confirms it's done. For security you must have signed in within the last 15 minutes.

## Known limitations in v1

These are known and recorded for follow-up:

- **Offline:** on phones, the app works offline while it's open, and changes sync when you're back online. A "You're offline" strip shows under the screen title. Data saved while offline doesn't survive closing the app before you're back online.
- **PDF attachments** in Ask are stored but not read by the AI.
- **The PDF report** doesn't include kick and contraction sessions or the birth plan.
- **Export for free users:** "Export my data" in You is a Plus feature, so free users can't export their data.
- **Past pregnancies** can be read (You → Past pregnancies) but not edited.
- **Baby mode** has no reminders (e.g. feed reminders) and no PDF report yet.
- **Email sign-ups** appear as "User" in Community (there's no display-name setting yet).
- **Tools wording:** "Share timeline" says "Invite your partner to follow along", but it is a one-time share.
