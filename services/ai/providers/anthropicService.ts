import { IAIService, AIRequest, AIResponse, PregnancyContext } from '../types';

export class AnthropicService implements IAIService {
  private apiKey: string;
  private model: string;
  private baseUrl: string = 'https://api.anthropic.com/v1';

  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async sendMessage(request: AIRequest): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: request.maxTokens || 1024,
          temperature: request.temperature || 0.7,
          system: request.systemPrompt,
          messages: request.messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      return {
        content: data.content[0].text,
        finishReason: data.stop_reason === 'end_turn' ? 'stop' : 'length',
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        },
      };
    } catch (error: any) {
      console.error('Anthropic API error:', error);
      throw error;
    }
  }

  buildSystemPrompt(context: PregnancyContext): string {
    const { pregnancy, recentVisits, recentSymptoms, recentMilestones } = context;

    // Calculate days until due date
    const daysUntilDue = Math.ceil(
      (pregnancy.dueDate.toDate().getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    let prompt = `You are a supportive, knowledgeable AI assistant for a pregnancy tracking app called NewLifeJournal.

IMPORTANT GUIDELINES:
- Provide helpful, evidence-based information about pregnancy
- Be empathetic, supportive, and encouraging
- Always recommend consulting healthcare providers for medical concerns
- Never provide specific medical diagnoses or treatment recommendations
- Use the user's pregnancy data to give personalized, context-aware responses
- Keep responses conversational and easy to understand

USER'S PREGNANCY INFORMATION:
- Mother's name: ${pregnancy.motherName}
- Current week: ${pregnancy.currentWeek} of 40 weeks
- Due date: ${pregnancy.dueDate.toDate().toLocaleDateString()}
- Days until due: ${daysUntilDue} days`;

    if (pregnancy.babyName) {
      prompt += `\n- Baby's name: ${pregnancy.babyName}`;
    }

    if (pregnancy.hospital) {
      prompt += `\n- Hospital: ${pregnancy.hospital}`;
    }

    if (pregnancy.doctorName) {
      prompt += `\n- Doctor: ${pregnancy.doctorName}`;
    }

    if (recentSymptoms.length > 0) {
      prompt += `\n\nRECENT SYMPTOMS (last 5):`;
      recentSymptoms.slice(0, 5).forEach(s => {
        prompt += `\n- ${s.type.replace('_', ' ')} (severity ${s.severity}/5) on ${s.date.toDate().toLocaleDateString()}`;
        if (s.notes) prompt += ` - ${s.notes}`;
      });
    }

    if (recentVisits.length > 0) {
      prompt += `\n\nRECENT HOSPITAL VISITS:`;
      recentVisits.slice(0, 3).forEach(v => {
        prompt += `\n- ${v.type} on ${v.date.toDate().toLocaleDateString()} (week ${v.week})`;
        if (v.notes) prompt += ` - ${v.notes}`;
      });
    }

    if (recentMilestones.length > 0) {
      prompt += `\n\nRECENT MILESTONES:`;
      recentMilestones.slice(0, 3).forEach(m => {
        prompt += `\n- ${m.title} on ${m.date.toDate().toLocaleDateString()}`;
      });
    }

    return prompt;
  }
}
