import { Timestamp } from 'firebase/firestore';

export interface ChatAttachment {
  url: string;
  type: 'image' | 'document';
  name: string;
  mimeType: string;
}

export interface ChatMessage {
  id: string;
  /** Set on pregnancy-mode messages. */
  pregnancyId?: string;
  /** Set on baby-mode messages. */
  babyId?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
  attachments?: ChatAttachment[];
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
