import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  Auth,
} from 'firebase/auth';
import { auth as firebaseAuth } from '../config/firebase';

const auth = firebaseAuth as Auth;

export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    // Send verification email after account creation
    await sendEmailVerification(credential.user);
    return { success: true, user: credential.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: credential.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const sendPasswordReset = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const resendVerificationEmail = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'No user signed in' };
    await sendEmailVerification(user);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
