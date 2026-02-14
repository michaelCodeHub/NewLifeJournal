# NewLifeJournal

A React Native mobile app for tracking pregnancy journey and baby growth.

## Features

- **Pregnancy Tracking**: Monitor pregnancy milestones, hospital visits, and symptoms
- **Baby Tracking**: Log baby activities (feeding, sleep, diaper), growth, and health events
- **Google Authentication**: Secure sign-in with Google
- **Offline Support**: Works offline with Firebase persistence
- **Cross-Platform**: iOS and Android support

## Tech Stack

- **React Native** 0.81.5 + **Expo** 54.0.33
- **TypeScript** 5.9.2
- **Expo Router** 6.0.23 (file-based navigation)
- **Firebase** 12.9.0 (Authentication + Firestore)
- **Google Sign-In** via @react-native-google-signin/google-signin

## Project Structure

```
NewLifeJournal/
├── app/                      # Expo Router screens
│   ├── _layout.tsx          # Root layout with AuthProvider
│   ├── index.tsx            # Route redirector
│   ├── (auth)/              # Authentication screens
│   ├── (onboarding)/        # Onboarding flow
│   ├── (pregnancy)/         # Pregnancy tracking
│   └── (baby)/              # Baby tracking
├── context/                  # React Context providers
│   └── AuthContext.tsx      # Authentication state
├── services/                 # Business logic
│   ├── googleAuth.ts        # Google OAuth
│   └── firebase/            # Firebase services
├── hooks/                    # Custom React hooks
├── types/                    # TypeScript definitions
├── components/               # Reusable UI components
└── config/                   # App configuration
    └── firebase.ts          # Firebase initialization
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Firestore Database**
3. Enable **Google Authentication** in Authentication > Sign-in method
4. Download configuration files:
   - **iOS**: `GoogleService-Info.plist` (place in root directory)
   - **Android**: `google-services.json` (place in root directory)

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials for:
   - **Web Client ID** (for Firebase)
   - **iOS Client ID** (from Firebase iOS app)
   - **Android Client ID** (from Firebase Android app)

### 5. Environment Configuration

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Fill in your Firebase and Google OAuth credentials:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_ios_client_id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_android_client_id.apps.googleusercontent.com
```

### 6. Run the App

```bash
# Start Expo dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Development Status

### ✅ Phase 1: Foundation (COMPLETED)
- [x] Project initialization
- [x] Expo Router navigation setup
- [x] TypeScript type definitions
- [x] Firebase configuration
- [x] Google Sign-In authentication
- [x] AuthContext for auth state management
- [x] Login screen
- [x] Basic navigation structure

### 🚧 Phase 2: Pregnancy Features (Next)
- [ ] Pregnancy data service (Firestore CRUD)
- [ ] Pregnancy onboarding flow
- [ ] Pregnancy dashboard
- [ ] Hospital visits tracking
- [ ] Symptom logging
- [ ] Week-by-week pregnancy info

### 📋 Phase 3: Baby Features (Planned)
- [ ] Baby data service
- [ ] Baby onboarding
- [ ] Pregnancy-to-baby transition
- [ ] Baby dashboard
- [ ] Activity logging (feed, sleep, diaper)
- [ ] Growth tracking
- [ ] Health events (vaccinations, checkups)

### 🎨 Phase 4: Polish (Planned)
- [ ] Timeline feature
- [ ] Settings screen
- [ ] User profile management
- [ ] Offline testing
- [ ] UI/UX polish

## Firebase Security Rules

Deploy Firestore security rules to protect user data:

1. Create `firestore.rules` file
2. Deploy with: `firebase deploy --only firestore:rules`

## Troubleshooting

### Google Sign-In not working

- Ensure `GoogleService-Info.plist` (iOS) and `google-services.json` (Android) are in the root directory
- Verify OAuth client IDs match your Firebase project
- Check that Google Sign-In is enabled in Firebase Console

### "Cannot find module" errors

```bash
npm install --legacy-peer-deps
```

### Expo Router navigation issues

- Clear cache: `npx expo start -c`
- Rebuild: `rm -rf node_modules && npm install`

## Next Steps

1. **Set up Firebase project** and add credentials to `.env`
2. **Configure Google OAuth** and test sign-in
3. **Implement Pregnancy Service** for CRUD operations
4. **Build Pregnancy Dashboard** with week tracking
5. **Add Hospital Visits** and symptom logging features

## License

Private - All rights reserved

## Contact

For questions or support, contact the development team.
