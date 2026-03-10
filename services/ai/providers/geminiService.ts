import { IAIService, AIRequest, AIResponse, PregnancyContext } from '../types';
import { AnthropicService } from './anthropicService';

export class GeminiService implements IAIService {
  private apiKey: string;
  private model: string;
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string, model: string = 'gemini-1.5-pro') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async sendMessage(request: AIRequest): Promise<AIResponse> {
    try {
      // Convert messages to Gemini format (role: 'user' | 'model')
      const contents = request.messages
        .filter(m => m.role !== 'system')
        .map(m => {
          const parts: any[] = [];
          if (m.images && m.images.length > 0) {
            m.images.forEach(img => {
              parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
            });
          }
          parts.push({ text: m.content || 'What do you see in this image?' });
          return {
            role: m.role === 'assistant' ? 'model' : 'user',
            parts,
          };
        });

      // Prepend system prompt as first user message if provided
      if (request.systemPrompt) {
        contents.unshift({
          role: 'user',
          parts: [{ text: request.systemPrompt }],
        });
        // Add a model acknowledgment
        contents.splice(1, 0, {
          role: 'model',
          parts: [{ text: 'Understood. I will follow these guidelines when responding.' }],
        });
      }

      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: request.temperature || 0.7,
              maxOutputTokens: request.maxTokens || 1024,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      return {
        content: data.candidates[0].content.parts[0].text,
        finishReason: 'stop',
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount || 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata?.totalTokenCount || 0,
        },
      };
    } catch (error: any) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  buildSystemPrompt(context: PregnancyContext): string {
    // Reuse the same system prompt builder from Anthropic service
    const anthropicService = new AnthropicService('', '');
    return anthropicService.buildSystemPrompt(context);
  }
}
