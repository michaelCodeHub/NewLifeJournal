import { Timestamp } from 'firebase/firestore';

export interface ChatAttachment {
  url: string;
  type: 'image' | 'document';
  name: string;
  mimeType: string;
}

export interface ChatMessage {
  id: string;
  pregnancyId: string;
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
