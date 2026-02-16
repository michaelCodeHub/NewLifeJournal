import { Pregnancy, HospitalVisit, Symptom, Milestone } from '../../types';

export type AIProvider = 'anthropic' | 'openai' | 'gemini' | 'custom';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface AIRequest {
  messages: AIMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
  finishReason?: 'stop' | 'length' | 'error';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface PregnancyContext {
  pregnancy: Pregnancy;
  recentVisits: HospitalVisit[];
  recentSymptoms: Symptom[];
  recentMilestones: Milestone[];
}

export interface AIServiceConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
}

export interface IAIService {
  sendMessage(request: AIRequest): Promise<AIResponse>;
  streamMessage?(request: AIRequest): AsyncIterableIterator<string>;
  buildSystemPrompt(context: PregnancyContext): string;
}
