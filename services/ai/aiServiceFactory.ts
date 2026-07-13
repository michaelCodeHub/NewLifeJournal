import { IAIService } from './types';
import { BackendAIService } from './providers/backendService';

export class AIServiceFactory {
  /**
   * Always returns the backend-proxied AI service — provider selection
   * (anthropic/openai/gemini/custom) and API keys are now entirely
   * server-side config (see functions/src/aiChat.ts), so the client no
   * longer needs to know or care which provider is configured.
   */
  static createService(): IAIService {
    return new BackendAIService();
  }
}
