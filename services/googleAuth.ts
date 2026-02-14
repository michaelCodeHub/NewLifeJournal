import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../config/firebase';
import Constants from 'expo-constants';

// Configure Google Sign-In
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: Constants.expoConfig?.extra?.googleWebClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: Constants.expoConfig?.extra?.googleIosClientId || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: true,
  });
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
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
    await GoogleSignin.signOut();
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

// Check if user is signed in to Google
export const isSignedInToGoogle = async () => {
  return await GoogleSignin.isSignedIn();
};

// Get current Google user
export const getCurrentGoogleUser = async () => {
  try {
    const userInfo = await GoogleSignin.signInSilently();
    return userInfo;
  } catch (error) {
    return null;
  }
};
