# Web + Local Testing Guide

## Running on web

```bash
npm install            # ensure react-dom, react-native-web, @expo/metro-runtime are present
npx expo start --web   # serves at http://localhost:8081
```

Google Sign-In on web uses Firebase's `signInWithPopup` (the native
`@react-native-google-signin` library has no web support). `localhost:8081`
must be an authorized origin in the Firebase/Google OAuth client.

## Local testing with the Firebase Emulators

A fully gated dev path lets you drive the authenticated flow locally without
touching production data or completing a real Google login. It is **only**
active when `EXPO_PUBLIC_USE_EMULATOR=1` — otherwise all of this is inert.

Requires Java (for the emulators): `brew install openjdk`.

### 1. Start the emulators

```bash
npx firebase emulators:start --only auth,firestore --project newlifejournal-e6826
```

Auth → :9099, Firestore → :8080, Emulator UI → http://localhost:4000

### 2. Create the test user (once per emulator session)

```bash
curl -s -X POST "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key" \
  -H "Content-Type: application/json" \
  -d '{"email":"devtest@newlifejournal.test","password":"DevTest12345!","returnSecureToken":true}'
```

### 3. Start Expo pointed at the emulators

```bash
EXPO_PUBLIC_USE_EMULATOR=1 npx expo start --web -c
```

With the flag set, `config/firebase.ts` connects Auth + Firestore to the
emulators, and the login screen shows a **🔧 Dev Test Login** button that signs
in as the test user (and seeds its user profile doc, mirroring the real Google
flow).

## Headless smoke test (`drive.js`)

`drive.js` (repo root) uses Playwright to load the app, click Dev Test Login,
walk through onboarding → home, and screenshot each tab to `/tmp/`. Run it
against an emulator-mode server:

```bash
npm install -D playwright && npx playwright install chromium
node drive.js
```
