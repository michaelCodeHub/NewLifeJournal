import { IAIService, AIRequest, AIResponse, PregnancyContext } from '../types';
import { AnthropicService } from './anthropicService';

export class CustomService implements IAIService {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string = '') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async sendMessage(request: AIRequest): Promise<AIResponse> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: request.messages,
          systemPrompt: request.systemPrompt,
          temperature: request.temperature,
          maxTokens: request.maxTokens,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Custom API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      return {
        content: data.content || data.message || data.response,
        finishReason: 'stop',
        usage: data.usage,
      };
    } catch (error: any) {
      console.error('Custom API error:', error);
      throw error;
    }
  }

  buildSystemPrompt(context: PregnancyContext): string {
    // Reuse the same system prompt builder from Anthropic service
    const anthropicService = new AnthropicService('', '');
    return anthropicService.buildSystemPrompt(context);
  }
}
