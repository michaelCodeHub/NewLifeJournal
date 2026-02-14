import { Timestamp } from 'firebase/firestore';

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
}

export interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
}
