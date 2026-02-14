# NewLifeJournal - Quick Setup Guide

This guide will help you configure Firebase and Google OAuth for the NewLifeJournal app.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name: `NewLifeJournal` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Firestore Database

1. In Firebase Console, go to **Build > Firestore Database**
2. Click "Create database"
3. Choose **Start in production mode** (we'll add security rules later)
4. Select a Firestore location (choose closest to your users)
5. Click "Enable"

## Step 3: Enable Google Authentication

1. In Firebase Console, go to **Build > Authentication**
2. Click "Get started"
3. Go to **Sign-in method** tab
4. Click on **Google** provider
5. Toggle "Enable"
6. Set a support email (your email)
7. Click "Save"

## Step 4: Register iOS App

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Under "Your apps", click **iOS** icon
3. Fill in:
   - **iOS bundle ID**: `com.newlifejournal.app`
   - **App nickname**: NewLifeJournal iOS
4. Click "Register app"
5. **Download `GoogleService-Info.plist`**
6. Move the downloaded file to your project root:
   ```bash
   mv ~/Downloads/GoogleService-Info.plist /Users/michaeljaison/Documents/Projects/NewLifeJournal/
   ```
7. Click "Next" through the remaining steps

## Step 5: Register Android App

1. In **Project Settings**, under "Your apps", click **Android** icon
2. Fill in:
   - **Android package name**: `com.newlifejournal.app`
   - **App nickname**: NewLifeJournal Android
3. Click "Register app"
4. **Download `google-services.json`**
5. Move the downloaded file to your project root:
   ```bash
   mv ~/Downloads/google-services.json /Users/michaeljaison/Documents/Projects/NewLifeJournal/
   ```
6. Click "Next" through the remaining steps

## Step 6: Get Firebase Configuration

1. In **Project Settings**, scroll to "Your apps"
2. For **Web app** (or create one if needed):
   - Click "Add app" > Web icon
   - Register with nickname: NewLifeJournal Web
3. Copy the Firebase configuration values

## Step 7: Create .env File

1. Copy the example file:
   ```bash
   cd /Users/michaeljaison/Documents/Projects/NewLifeJournal
   cp .env.example .env
   ```

2. Open `.env` and fill in Firebase values from Step 6:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

## Step 8: Get Google OAuth Client IDs

### For iOS:

1. Open `GoogleService-Info.plist`
2. Find the `CLIENT_ID` value (format: `xxx-xxx.apps.googleusercontent.com`)
3. Copy this value to `.env` as `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

### For Web Client ID:

1. In Firebase Console, go to **Authentication > Sign-in method > Google**
2. Expand the Google provider
3. Copy the **Web SDK configuration > Web client ID**
4. Add to `.env` as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

### For Android:

1. In Firebase Console, go to **Project Settings**
2. Under "Your apps", select the Android app
3. Copy the **Web client ID** from the OAuth 2.0 client
4. Add to `.env` as `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

Your `.env` should now look like:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXX
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=newlifejournal-xxxxx.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=newlifejournal-xxxxx
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=newlifejournal-xxxxx.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Google OAuth Configuration
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789012-xxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123456789012-yyyyyyyyyyyyyyyyyy.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=123456789012-zzzzzzzzzzzzzzzzzz.apps.googleusercontent.com
```

## Step 9: Deploy Firestore Security Rules

Create a `firestore.rules` file in the project root:

```bash
cat > /Users/michaeljaison/Documents/Projects/NewLifeJournal/firestore.rules << 'EOF'
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // Users collection
    match /users/{userId} {
      allow read, write: if isOwner(userId);

      // Pregnancies subcollection
      match /pregnancies/{pregnancyId} {
        allow read, write: if isOwner(userId);

        match /{subcollection}/{documentId} {
          allow read, write: if isOwner(userId);
        }
      }

      // Babies subcollection
      match /babies/{babyId} {
        allow read, write: if isOwner(userId);

        match /{subcollection}/{documentId} {
          allow read, write: if isOwner(userId);
        }
      }
    }

    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
EOF
```

Deploy the rules:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init firestore

# Deploy the rules
firebase deploy --only firestore:rules
```

## Step 10: Test the App

1. Start the Expo dev server:
   ```bash
   cd /Users/michaeljaison/Documents/Projects/NewLifeJournal
   npm start
   ```

2. Run on iOS Simulator:
   ```bash
   npm run ios
   ```

3. Or run on Android Emulator:
   ```bash
   npm run android
   ```

4. Test Google Sign-In:
   - Click "Sign in with Google" button
   - Select a Google account
   - Verify you're redirected to the onboarding screen

## Troubleshooting

### Google Sign-In Error: "Developer Error"

This usually means the OAuth client IDs don't match. Verify:

1. `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` matches the Web client ID from Firebase Console
2. `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` is from `GoogleService-Info.plist`
3. The bundle ID `com.newlifejournal.app` matches in all configurations

### "Auth/operation-not-allowed"

- Ensure Google sign-in is enabled in Firebase Console > Authentication > Sign-in method

### Cannot find GoogleService-Info.plist

- Make sure you moved the file to the project root
- File should be at: `/Users/michaeljaison/Documents/Projects/NewLifeJournal/GoogleService-Info.plist`

### App crashes on Android

- Ensure `google-services.json` is in the project root
- Rebuild the app: `npx expo run:android`

## Next Steps

Once authentication is working:

1. ✅ Users can sign in with Google
2. ✅ User profile is created in Firestore
3. Next: Implement pregnancy tracking features (see Phase 2 in plan)

## Support

For issues or questions, refer to:
- [Expo Documentation](https://docs.expo.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Native Firebase](https://rnfirebase.io/)
