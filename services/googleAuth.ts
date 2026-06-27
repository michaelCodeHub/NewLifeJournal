import { Platform } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup, Auth } from 'firebase/auth';
import { auth as firebaseAuth } from '../config/firebase';
import Constants from 'expo-constants';

// Cast to typed Auth to satisfy TS since firebase.ts uses a let + try/catch init pattern
const auth = firebaseAuth as Auth;

const isWeb = Platform.OS === 'web';

// Configure Google Sign-In
export const configureGoogleSignIn = () => {
  // The native @react-native-google-signin library has no web implementation;
  // on web we use Firebase's signInWithPopup instead, so skip configuration.
  if (isWeb) return;

  GoogleSignin.configure({
    webClientId: Constants.expoConfig?.extra?.googleWebClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: Constants.expoConfig?.extra?.googleIosClientId || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: true,
  });
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    if (isWeb) {
      // On web, drive the Google OAuth flow through Firebase directly.
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      return {
        success: true,
        user: userCredential.user,
      };
    }

    // Check if device supports Google Play services
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Get user info from Google
    const userInfo = await GoogleSignin.signIn();

    // Create Firebase credential from Google ID token
    const googleCredential = GoogleAuthProvider.credential(userInfo.data?.idToken);

    // Sign in to Firebase with the credential
    const userCredential = await signInWithCredential(auth, googleCredential);

    return {
      success: true,
      user: userCredential.user,
    };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to sign in with Google',
    };
  }
};

// Sign out from Google and Firebase
export const signOutFromGoogle = async () => {
  try {
    if (!isWeb) {
      await GoogleSignin.signOut();
    }
    await auth.signOut();
    return { success: true };
  } catch (error: any) {
    console.error('Sign Out Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to sign out',
    };
  }
};

// Check if user is signed in to Google (uses getCurrentUser instead of deprecated isSignedIn)
export const isSignedInToGoogle = async (): Promise<boolean> => {
  if (isWeb) return auth.currentUser !== null;
  return GoogleSignin.getCurrentUser() !== null;
};

// Get current Google user
export const getCurrentGoogleUser = async () => {
  if (isWeb) return auth.currentUser;
  try {
    const userInfo = await GoogleSignin.signInSilently();
    return userInfo;
  } catch (error) {
    return null;
  }
};
