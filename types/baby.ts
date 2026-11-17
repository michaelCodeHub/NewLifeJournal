import { Timestamp } from 'firebase/firestore';

/**
 * Baby mode data, stored under users/{uid}/babies/{babyId}:
 *   activities/{id}  feeds, diapers and sleep (one collection, `type` tells them apart)
 *   growth/{id}      weight / height / head circumference measurements
 *   health/{id}      vaccines, checkups, illnesses, medicines
 *   chatMessages/{id} the AI conversation while in baby mode
 */
export interface Baby {
  id: string;
  name: string;
  birthDate: Timestamp;
  /** kg */
  birthWeight?: number;
  /** cm */
  birthHeight?: number;
  gender?: 'girl' | 'boy' | 'other';
  /** Set when the baby was added through "Baby has arrived" — links back to the pregnancy journal. */
  fromPregnancyId?: string;
  status: 'active' | 'archived';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ActivityType = 'feeding' | 'diaper' | 'sleep';

export type FeedType = 'breast' | 'bottle' | 'solid';
export type BreastSide = 'left' | 'right' | 'both';
export type DiaperKind = 'wet' | 'dirty' | 'both';
export type DiaperColor = 'normal' | 'yellow' | 'green' | 'other';

export interface FeedingDetails {
  feedType: FeedType;
  /** Breast feeds only. */
  side?: BreastSide;
  /** Bottle/solid amount, always stored in ml (the UI can enter oz). */
  amountMl?: number;
}

export interface DiaperDetails {
  kind: DiaperKind;
  color?: DiaperColor;
}

/**
 * One feed, diaper change or sleep. Timed activities (feeds, sleep) are
 * "running" while `endedAt` is missing: the start time lives in Firestore, so
 * a timer survives leaving the screen or restarting the app.
 */
export interface BabyActivity {
  id: string;
  type: ActivityType;
  startedAt: Timestamp;
  endedAt?: Timestamp;
  feeding?: FeedingDetails;
  diaper?: DiaperDetails;
  notes?: string;
  createdAt: Timestamp;
}

export interface GrowthRecord {
  id: string;
  date: Timestamp;
  weightKg?: number;
  heightCm?: number;
  headCm?: number;
  notes?: string;
  createdAt: Timestamp;
}

export type HealthEventType = 'vaccine' | 'checkup' | 'illness' | 'medicine';

export interface HealthEvent {
  id: string;
  type: HealthEventType;
  date: Timestamp;
  title: string;
  notes?: string;
  /** e.g. the next dose or follow-up appointment. */
  nextDate?: Timestamp;
  createdAt: Timestamp;
}
