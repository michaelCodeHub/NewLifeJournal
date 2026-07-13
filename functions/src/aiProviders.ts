// Server-side mirrors of the client's services/ai/providers/*.ts — same request
// shapes and API calls, but running here means the provider API keys only ever
// exist in Secret Manager / the Functions runtime, never in the app bundle.

export interface AIImageData {
  base64: string;
  mimeType: string;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: AIImageData[];
}

export interface AiChatRequest {
  messages: AIMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIResult {
  content: string;
  usage?: AIUsage;
}

export async function callAnthropic(
  data: AiChatRequest,
  apiKey: string,
  model: string
): Promise<AIResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: data.maxTokens || 1024,
      temperature: data.temperature ?? 0.7,
      system: data.systemPrompt,
      messages: data.messages
        .filter((m) => m.role !== 'system')
        .map((m) => {
          if (m.images && m.images.length > 0) {
            const blocks: any[] = m.images.map((img) => ({
              type: 'image',
              source: { type: 'base64', media_type: img.mimeType, data: img.base64 },
            }));
            blocks.push({ type: 'text', text: m.content || 'What do you see in this image?' });
            return { role: m.role, content: blocks };
          }
          return { role: m.role, content: m.content };
        }),
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errText}`);
  }

  const json: any = await response.json();
  return {
    content: json.content[0].text,
    usage: {
      promptTokens: json.usage.input_tokens,
      completionTokens: json.usage.output_tokens,
      totalTokens: json.usage.input_tokens + json.usage.output_tokens,
    },
  };
}

export async function callOpenAI(
  data: AiChatRequest,
  apiKey: string,
  model: string
): Promise<AIResult> {
  const messages: any[] = [...data.messages];
  if (data.systemPrompt) {
    messages.unshift({ role: 'system', content: data.systemPrompt });
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => {
        if (m.images && m.images.length > 0) {
          const parts: any[] = m.images.map((img: AIImageData) => ({
            type: 'image_url',
            image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
          }));
          parts.push({ type: 'text', text: m.content || 'What do you see in this image?' });
          return { role: m.role, content: parts };
        }
        return { role: m.role, content: m.content };
      }),
      max_tokens: data.maxTokens || 1024,
      temperature: data.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errText}`);
  }

  const json: any = await response.json();
  return {
    content: json.choices[0].message.content,
    usage: {
      promptTokens: json.usage.prompt_tokens,
      completionTokens: json.usage.completion_tokens,
      totalTokens: json.usage.total_tokens,
    },
  };
}

export async function callGemini(
  data: AiChatRequest,
  apiKey: string,
  model: string
): Promise<AIResult> {
  const contents = data.messages
    .filter((m) => m.role !== 'system')
    .map((m) => {
      const parts: any[] = [];
      if (m.images && m.images.length > 0) {
        m.images.forEach((img) => {
          parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
        });
      }
      parts.push({ text: m.content || 'What do you see in this image?' });
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });

  if (data.systemPrompt) {
    contents.unshift({ role: 'user', parts: [{ text: data.systemPrompt }] });
    contents.splice(1, 0, {
      role: 'model',
      parts: [{ text: 'Understood. I will follow these guidelines when responding.' }],
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: data.temperature ?? 0.7,
          maxOutputTokens: data.maxTokens || 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errText}`);
  }

  const json: any = await response.json();
  return {
    content: json.candidates[0].content.parts[0].text,
    usage: {
      promptTokens: json.usageMetadata?.promptTokenCount || 0,
      completionTokens: json.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: json.usageMetadata?.totalTokenCount || 0,
    },
  };
}

export async function callCustom(
  data: AiChatRequest,
  baseUrl: string,
  apiKey: string
): Promise<AIResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(`${baseUrl}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages: data.messages,
      systemPrompt: data.systemPrompt,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Custom AI API error: ${response.status} - ${errText}`);
  }

  const json: any = await response.json();
  return {
    content: json.content || json.message || json.response,
    usage: json.usage,
  };
}
