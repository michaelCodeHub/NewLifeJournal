import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { signInWithGoogle, signOutFromGoogle, configureGoogleSignIn } from '../services/googleAuth';
import { User, UserProfile, AuthState } from '../types';
import * as SecureStore from 'expo-secure-store';

interface AuthContextType extends AuthState {
  signIn: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'auth_token';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configure Google Sign-In on mount
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const userData: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };
        setUser(userData);

        // Fetch user profile from Firestore
        await fetchUserProfile(firebaseUser.uid);

        // Store auth token
        const token = await firebaseUser.getIdToken();
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
      } else {
        // User is signed out
        setUser(null);
        setUserProfile(null);
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch user profile from Firestore
  const fetchUserProfile = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  // Create or update user profile in Firestore
  const createOrUpdateUserProfile = async (firebaseUser: FirebaseUser) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userRef);

      const profileData: UserProfile = {
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || 'User',
        picture: firebaseUser.photoURL || undefined,
        createdAt: userDoc.exists() ? userDoc.data().createdAt : Timestamp.now(),
        lastLogin: Timestamp.now(),
        currentMode: userDoc.exists() ? userDoc.data().currentMode : null,
      };

      await setDoc(userRef, profileData, { merge: true });
      setUserProfile(profileData);
    } catch (err) {
      console.error('Error creating/updating user profile:', err);
    }
  };

  // Sign in with Google
  const signIn = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await signInWithGoogle();

      if (result.success && result.user) {
        // Create or update user profile
        await createOrUpdateUserProfile(result.user);
        return { success: true };
      } else {
        setError(result.error || 'Sign in failed');
        return { success: false, error: result.error };
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred during sign in';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      await signOutFromGoogle();
      setUser(null);
      setUserProfile(null);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign out');
    } finally {
      setLoading(false);
    }
  };

  // Refresh user profile
  const refreshUserProfile = async () => {
    if (user) {
      await fetchUserProfile(user.uid);
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    error,
    signIn,
    signOut,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
