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
          messages: request.messages.filter(m => m.role !== 'system').map(m => {
            // Build multimodal content array if images are present
            if (m.images && m.images.length > 0) {
              const contentBlocks: any[] = m.images.map(img => ({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: img.mimeType,
                  data: img.base64,
                },
              }));
              contentBlocks.push({ type: 'text', text: m.content || 'What do you see in this image?' });
              return { role: m.role, content: contentBlocks };
            }
            return { role: m.role, content: m.content };
          }),
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
    const { pregnancy, recentVisits, recentSymptoms, allSymptoms, recentMilestones, weekInfo } = context;

    // Calculate days until due date
    const daysUntilDue = Math.ceil(
      (pregnancy.dueDate.toDate().getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const week = pregnancy.currentWeek;
    const trimester = week <= 12 ? 1 : week <= 27 ? 2 : 3;

    const toneGuide: Record<number, string> = {
      1: 'The user is in their first trimester. Be especially reassuring about early symptoms like nausea and fatigue. Focus on what to expect at upcoming appointments.',
      2: 'The user is in their second trimester, often called the "honeymoon" period. Celebrate milestones like feeling first kicks. Focus on nutrition and staying active.',
      3: 'The user is in their third trimester and approaching delivery. Focus on birth preparation, hospital readiness, and managing late-pregnancy discomfort. Be encouraging about the home stretch.',
    };

    let prompt = `You are a supportive, knowledgeable AI assistant for a pregnancy tracking app called NewLifeJournal.

IMPORTANT GUIDELINES:
- Provide helpful, evidence-based information about pregnancy
- Be empathetic, supportive, and encouraging
- Always recommend consulting healthcare providers for medical concerns
- Never provide specific medical diagnoses or treatment recommendations
- Use the user's pregnancy data to give personalized, context-aware responses
- Keep responses conversational and easy to understand
- Address the user by name when appropriate

CONVERSATION TONE:
${toneGuide[trimester]}

USER'S PREGNANCY INFORMATION:
- Mother's name: ${pregnancy.motherName}
- Current week: ${week} of 40 weeks (Trimester ${trimester})
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

    // Week-specific baby development info
    if (weekInfo) {
      prompt += `\n\nTHIS WEEK'S DETAILS (Week ${weekInfo.week}):`;
      prompt += `\n- Baby size: ${weekInfo.babySize}`;
      prompt += `\n- Baby length: ${weekInfo.babyLength}`;
      prompt += `\n- Baby weight: ${weekInfo.babyWeight}`;
      if (weekInfo.babyDevelopment.length > 0) {
        prompt += `\n- Development: ${weekInfo.babyDevelopment.join('; ')}`;
      }
      if (weekInfo.motherChanges.length > 0) {
        prompt += `\n- Mother's changes: ${weekInfo.motherChanges.join('; ')}`;
      }
      if (weekInfo.tips.length > 0) {
        prompt += `\n- Tips: ${weekInfo.tips.join('; ')}`;
      }
    }

    // Recent symptoms
    if (recentSymptoms.length > 0) {
      prompt += `\n\nRECENT SYMPTOMS (last 5):`;
      recentSymptoms.slice(0, 5).forEach(s => {
        prompt += `\n- ${s.type.replace('_', ' ')} (severity ${s.severity}/5) on ${s.date.toDate().toLocaleDateString()}`;
        if (s.notes) prompt += ` - ${s.notes}`;
      });
    }

    // Symptom pattern summary
    if (allSymptoms && allSymptoms.length > 0) {
      const symptomCounts: Record<string, number> = {};
      allSymptoms.forEach(s => {
        const type = s.type.replace('_', ' ');
        symptomCounts[type] = (symptomCounts[type] || 0) + 1;
      });
      const topSymptoms = Object.entries(symptomCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      if (topSymptoms.length > 0) {
        prompt += `\n\nSYMPTOM PATTERNS (most frequent across pregnancy):`;
        topSymptoms.forEach(([type, count]) => {
          prompt += `\n- ${type}: reported ${count} time${count > 1 ? 's' : ''}`;
        });
      }
    }

    // Recent and upcoming visits
    const now = new Date();
    if (recentVisits.length > 0) {
      const pastVisits = recentVisits.filter(v => v.date.toDate() <= now);
      const upcomingVisits = recentVisits.filter(v => v.date.toDate() > now);

      if (pastVisits.length > 0) {
        prompt += `\n\nRECENT HOSPITAL VISITS:`;
        pastVisits.slice(0, 3).forEach(v => {
          prompt += `\n- ${v.type} on ${v.date.toDate().toLocaleDateString()} (week ${v.week})`;
          if (v.notes) prompt += ` - ${v.notes}`;
        });
      }

      if (upcomingVisits.length > 0) {
        prompt += `\n\nUPCOMING APPOINTMENTS:`;
        upcomingVisits.slice(0, 3).forEach(v => {
          prompt += `\n- ${v.type} on ${v.date.toDate().toLocaleDateString()}`;
        });
      }
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
