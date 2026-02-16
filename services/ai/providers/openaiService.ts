import { IAIService, AIRequest, AIResponse, PregnancyContext } from '../types';
import { AnthropicService } from './anthropicService';

export class OpenAIService implements IAIService {
  private apiKey: string;
  private model: string;
  private baseUrl: string = 'https://api.openai.com/v1';

  constructor(apiKey: string, model: string = 'gpt-4o') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async sendMessage(request: AIRequest): Promise<AIResponse> {
    try {
      const messages = [...request.messages];

      // Add system prompt as first message if provided
      if (request.systemPrompt) {
        messages.unshift({
          role: 'system',
          content: request.systemPrompt,
        });
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: request.maxTokens || 1024,
          temperature: request.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      return {
        content: data.choices[0].message.content,
        finishReason: data.choices[0].finish_reason === 'stop' ? 'stop' : 'length',
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
      };
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  buildSystemPrompt(context: PregnancyContext): string {
    // Reuse the same system prompt builder from Anthropic service
    const anthropicService = new AnthropicService('', '');
    return anthropicService.buildSystemPrompt(context);
  }
}
