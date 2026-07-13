import { httpsCallable, FunctionsError } from 'firebase/functions';
import { functions } from '../../../config/firebase';
import { IAIService, AIRequest, AIResponse, PregnancyContext } from '../types';
import { buildSystemPrompt } from '../buildSystemPrompt';

interface AiChatCallableResponse {
  content: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  aiUsage?: { messagesUsedThisPeriod: number; limit: number; tier: 'free' | 'premium' };
}

const callAiChat = httpsCallable<AIRequest, AiChatCallableResponse>(functions, 'aiChat');

/**
 * Client-side stub that forwards chat requests to the `aiChat` Cloud
 * Function instead of calling an AI provider directly. The provider API key
 * lives only in the Functions runtime (Secret Manager) — see
 * functions/src/aiChat.ts. This also means the monthly free-message cap is
 * enforced server-side and can't be bypassed by editing local Firestore data.
 */
export class BackendAIService implements IAIService {
  async sendMessage(request: AIRequest): Promise<AIResponse> {
    try {
      const result = await callAiChat(request);
      const data = result.data;
      return {
        content: data.content,
        finishReason: 'stop',
        usage: data.usage,
        aiUsage: data.aiUsage,
      };
    } catch (error) {
      if (error instanceof FunctionsError) {
        // resource-exhausted -> free-tier cap hit; surface the server's message as-is.
        throw new Error(error.message);
      }
      throw error;
    }
  }

  buildSystemPrompt(context: PregnancyContext): string {
    return buildSystemPrompt(context);
  }
}
