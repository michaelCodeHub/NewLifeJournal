import Constants from 'expo-constants';
import { IAIService, AIProvider } from './types';
import { AnthropicService } from './providers/anthropicService';
import { OpenAIService } from './providers/openaiService';
import { GeminiService } from './providers/geminiService';
import { CustomService } from './providers/customService';

export class AIServiceFactory {
  static createService(): IAIService {
    const provider = (Constants.expoConfig?.extra?.aiProvider || 'anthropic') as AIProvider;

    switch (provider) {
      case 'anthropic':
        const anthropicKey = Constants.expoConfig?.extra?.anthropicApiKey;
        const anthropicModel = Constants.expoConfig?.extra?.anthropicModel || 'claude-3-5-sonnet-20241022';
        if (!anthropicKey) throw new Error('Anthropic API key not configured');
        return new AnthropicService(anthropicKey, anthropicModel);

      case 'openai':
        const openaiKey = Constants.expoConfig?.extra?.openaiApiKey;
        const openaiModel = Constants.expoConfig?.extra?.openaiModel || 'gpt-4o';
        if (!openaiKey) throw new Error('OpenAI API key not configured');
        return new OpenAIService(openaiKey, openaiModel);

      case 'gemini':
        const geminiKey = Constants.expoConfig?.extra?.geminiApiKey;
        const geminiModel = Constants.expoConfig?.extra?.geminiModel || 'gemini-1.5-pro';
        if (!geminiKey) throw new Error('Gemini API key not configured');
        return new GeminiService(geminiKey, geminiModel);

      case 'custom':
        const customUrl = Constants.expoConfig?.extra?.customAiUrl;
        const customKey = Constants.expoConfig?.extra?.customAiKey || '';
        if (!customUrl) throw new Error('Custom AI URL not configured');
        return new CustomService(customUrl, customKey);

      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }
  }
}
