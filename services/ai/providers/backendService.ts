import { httpsCallable, FunctionsError } from 'firebase/functions';
import { functions } from '../../../config/firebase';
import { IAIService, AIRequest, AIResponse, PregnancyContext } from '../types';
import { buildSystemPrompt } from '../buildSystemPrompt';
import { AiChatPayload, AiChatResult, StreamUnavailableError, canStreamAiChat, streamAiChat } from '../streamAiChat';

const callAiChat = httpsCallable<AiChatPayload, AiChatResult>(functions, 'aiChat');

/**
 * Client-side stub that forwards chat requests to the `aiChat` Cloud
 * Function instead of calling an AI provider directly. The provider API key
 * lives only in the Functions runtime (Secret Manager) — see
 * functions/src/aiChat.ts. This also means the monthly free-message cap is
 * enforced server-side and can't be bypassed by editing local Firestore data.
 */
export class BackendAIService implements IAIService {
  /**
   * With `onText`, the reply is streamed: `onText` gets the reply so far each
   * time more arrives. The returned response is always the complete reply.
   */
  async sendMessage(request: AIRequest, onText?: (textSoFar: string) => void): Promise<AIResponse> {
    // Only the conversation is sent. The server builds the system prompt
    // (with safety rules) from the user's own data and fixes the model
    // settings, so systemPrompt/temperature/maxTokens here are ignored.
    const payload: AiChatPayload = {
      messages: request.messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content, ...(m.images?.length ? { images: m.images } : {}) })),
      ...(request.babyId ? { babyId: request.babyId } : {}),
    };

    if (onText && canStreamAiChat()) {
      try {
        return toResponse(await streamAiChat(payload, onText));
      } catch (error) {
        // Only retry when the request never reached the server (nothing was counted).
        if (!(error instanceof StreamUnavailableError)) throw error;
      }
    }

    try {
      return toResponse((await callAiChat(payload)).data);
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

function toResponse(data: AiChatResult): AIResponse {
  return { content: data.content, finishReason: 'stop', usage: data.usage, aiUsage: data.aiUsage };
}
