import { Timestamp } from 'firebase/firestore';

export interface Baby {
  id: string;
  name: string;
  birthDate: Timestamp;
  birthWeight?: number;
  birthHeight?: number;
  gender?: 'male' | 'female' | 'other';
  profilePicture?: string;
  stage: 'newborn' | 'infant' | 'toddler';
  fromPregnancyId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Activity {
  id: string;
  babyId: string;
  type: 'feeding' | 'diaper' | 'sleep' | 'medicine' | 'play' | 'milestone';
  timestamp: Timestamp;
  duration?: number;
  notes?: string;
  details?: FeedingDetails | DiaperDetails | SleepDetails | MedicineDetails;
  createdAt: Timestamp;
}

export interface FeedingDetails {
  feedType: 'breast' | 'bottle' | 'solid';
  amount?: number;
  side?: 'left' | 'right' | 'both';
}

export interface DiaperDetails {
  type: 'wet' | 'dirty' | 'both';
}

export interface SleepDetails {
  startTime: Timestamp;
  endTime?: Timestamp;
  isRunning?: boolean;
}

export interface MedicineDetails {
  medicineName: string;
  dosage: string;
}

export interface GrowthRecord {
  id: string;
  babyId: string;
  date: Timestamp;
  ageInDays: number;
  weight?: number;
  height?: number;
  headCircumference?: number;
  createdAt: Timestamp;
}

export interface HealthEvent {
  id: string;
  babyId: string;
  type: 'vaccine' | 'doctor_visit' | 'illness' | 'checkup';
  date: Timestamp;
  title: string;
  notes?: string;
  nextDate?: Timestamp;
  createdAt: Timestamp;
}

export interface BabyTimeline {
  id: string;
  babyId: string;
  type: 'activity' | 'photo' | 'milestone' | 'health_event';
  timestamp: Timestamp;
  title: string;
  description?: string;
  imageUrl?: string;
  icon?: string;
  createdAt: Timestamp;
}
