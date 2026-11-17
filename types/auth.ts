import { Timestamp } from 'firebase/firestore';
import { SubscriptionInfo, AiUsage } from './subscription';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface UserProfile {
  email: string;
  name: string;
  picture?: string;
  createdAt: Timestamp;
  lastLogin: Timestamp;
  currentMode: 'pregnancy' | 'baby' | null;
  // Optional so existing user docs without these fields keep working —
  // absence is treated as free tier / zero usage. See MONETIZATION_PLAN.md.
  subscription?: SubscriptionInfo;
  aiUsage?: AiUsage;
  // Manual plan override for test/comped accounts. Server-only (firestore.rules);
  // set with functions/scripts/setPlan.js. Wins over any purchase.
  devTierOverride?: 'free' | 'premium' | null;
}

export interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  error: string | null;
}
