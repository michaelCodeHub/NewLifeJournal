import { Timestamp } from 'firebase/firestore';

export interface Pregnancy {
  id: string;
  motherName: string;
  dueDate: Timestamp;
  conceptionDate?: Timestamp;
  currentWeek: number;
  babyName?: string;
  hospital?: string;
  doctorName?: string;
  doctorPhone?: string;
  bloodType?: string;
  status: 'active' | 'completed' | 'archived';
  completedAt?: Timestamp;
  transitionedToBabyId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface HospitalVisit {
  id: string;
  pregnancyId: string;
  date: Timestamp;
  week: number;
  type: 'checkup' | 'ultrasound' | 'test' | 'emergency';
  notes?: string;
  weight?: number;
  bloodPressure?: string;
  nextVisitDate?: Timestamp;
  createdAt: Timestamp;
}

export interface Symptom {
  id: string;
  pregnancyId: string;
  date: Timestamp;
  week: number;
  type: 'nausea' | 'fatigue' | 'headache' | 'back_pain' | 'other';
  severity: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  createdAt: Timestamp;
}

export interface Milestone {
  id: string;
  pregnancyId: string;
  date: Timestamp;
  week: number;
  title: string;
  description?: string;
  imageUrl?: string;
  createdAt: Timestamp;
}

export interface PregnancyTimeline {
  id: string;
  pregnancyId: string;
  type: 'visit' | 'symptom' | 'milestone' | 'week_update';
  timestamp: Timestamp;
  title: string;
  description?: string;
  icon?: string;
  createdAt: Timestamp;
}

export interface KickSession {
  id: string;
  pregnancyId: string;
  date: Timestamp;        // session start time
  week: number;
  kickCount: number;
  durationMinutes: number;
  targetReached: boolean; // true if kickCount >= 10
  notes?: string;
  createdAt: Timestamp;
}

export interface Contraction {
  startTime: Timestamp;
  endTime: Timestamp;
  durationSeconds: number;   // endTime - startTime in seconds
  intervalSeconds?: number;  // seconds since previous contraction ended
}

export interface ContractionSession {
  id: string;
  pregnancyId: string;
  date: Timestamp;           // session start
  week: number;
  contractions: Contraction[];
  durationMinutes: number;   // total session length
  averageDurationSeconds: number;
  averageIntervalSeconds: number;
  notes?: string;
  createdAt: Timestamp;
}
