import { Timestamp } from 'firebase/firestore';

export interface ChatMessage {
  id: string;
  pregnancyId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
  metadata?: {
    model?: string;
    tokens?: number;
    error?: boolean;
  };
}

export interface ChatSession {
  id: string;
  pregnancyId: string;
  title?: string;
  lastMessageAt: Timestamp;
  messageCount: number;
  createdAt: Timestamp;
}
