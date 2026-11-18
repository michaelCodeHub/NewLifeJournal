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
  /** The model (and its fallback) declined; `content` is the app's kind decline message. */
  refused?: boolean;
}

/** Thinking shares max_tokens with the reply on current models: never go below this. */
export const ANTHROPIC_MIN_MAX_TOKENS = 4096;
export const ANTHROPIC_FALLBACK_BETA = 'server-side-fallback-2026-07-01';
/** Shown when the model (and its fallback) declines: kind, and points to real help. */
export const ANTHROPIC_REFUSAL_REPLY =
  "I'm not able to help with that one. For anything about your health or your baby's, your doctor, midwife or health visitor is the best person to ask.";

const usageOf = (json: any) => ({
  promptTokens: json?.usage?.input_tokens ?? 0,
  completionTokens: json?.usage?.output_tokens ?? 0,
  totalTokens: (json?.usage?.input_tokens ?? 0) + (json?.usage?.output_tokens ?? 0),
});

/** Receives reply text as it is written. `reset` drops what was sent so far (a fallback model takes over). */
export interface StreamSink {
  text(delta: string): void;
  reset(): void;
}

function anthropicBody(data: AiChatRequest, model: string, stream: boolean) {
  return JSON.stringify({
    model,
    // Current models think (adaptively) before answering and thinking counts toward
    // max_tokens, so leave room for it on top of the reply.
    max_tokens: Math.max(data.maxTokens ?? 0, ANTHROPIC_MIN_MAX_TOKENS),
    // No temperature / top_p / top_k: current models reject non-default sampling values.
    // Effort 'low' suits chat: quick, not over-thought.
    output_config: { effort: 'low' },
    fallbacks: 'default',
    ...(stream ? { stream: true } : {}),
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
  });
}

/** The reply text: text blocks after the last fallback switch (a declining model's partial text is dropped). */
export function anthropicReplyText(content: unknown): string {
  const blocks = Array.isArray(content) ? content : [];
  let from = 0;
  blocks.forEach((b: any, i) => {
    if (b?.type === 'fallback') from = i + 1;
  });
  return blocks
    .slice(from)
    .filter((b: any) => b?.type === 'text' && typeof b.text === 'string')
    .map((b: any) => b.text)
    .join('')
    .trim();
}

function finishAnthropic(text: string, stopReason: unknown, usage: AIUsage): AIResult {
  if (stopReason === 'refusal') {
    // The whole chain declined (possibly mid-reply): never show a partial answer.
    return { content: ANTHROPIC_REFUSAL_REPLY, usage, refused: true };
  }
  if (!text) throw new Error(`Anthropic returned no text (stop_reason: ${stopReason})`);
  return { content: text, usage };
}

/**
 * Calls Claude. With a `sink`, the reply is streamed (SSE) and each piece of text is
 * passed on as it arrives; the returned result is always the complete, final reply.
 */
export async function callAnthropic(
  data: AiChatRequest,
  apiKey: string,
  model: string,
  sink?: StreamSink
): Promise<AIResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // Server-side refusal fallback: if the model declines, another model answers in the same call.
      'anthropic-beta': ANTHROPIC_FALLBACK_BETA,
    },
    body: anthropicBody(data, model, !!sink),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errText}`);
  }

  if (!sink || !response.body) {
    const json: any = await response.json();
    return finishAnthropic(anthropicReplyText(json.content), json.stop_reason, usageOf(json));
  }

  let text = '';
  let stopReason: unknown = null;
  let inputTokens = 0;
  let outputTokens = 0;
  const onEvent = (ev: any) => {
    switch (ev?.type) {
      case 'message_start':
        inputTokens = ev.message?.usage?.input_tokens ?? inputTokens;
        break;
      case 'content_block_start':
        if (ev.content_block?.type === 'fallback') {
          // Another model takes over from the start of this turn's reply.
          text = '';
          sink.reset();
        }
        break;
      case 'content_block_delta':
        if (ev.delta?.type === 'text_delta' && typeof ev.delta.text === 'string') {
          text += ev.delta.text;
          sink.text(ev.delta.text);
        }
        break;
      case 'message_delta':
        stopReason = ev.delta?.stop_reason ?? stopReason;
        outputTokens = ev.usage?.output_tokens ?? outputTokens;
        if (typeof ev.usage?.input_tokens === 'number') inputTokens = ev.usage.input_tokens;
        break;
      case 'error':
        throw new Error(`Anthropic stream error: ${JSON.stringify(ev.error ?? ev).slice(0, 500)}`);
    }
  };

  await readSse(response.body, onEvent);
  return finishAnthropic(text.trim(), stopReason, {
    promptTokens: inputTokens,
    completionTokens: outputTokens,
    totalTokens: inputTokens + outputTokens,
  });
}

/** Parses a Server-Sent Events body, calling `onEvent` with each JSON `data:` payload. */
export async function readSse(body: ReadableStream<Uint8Array>, onEvent: (ev: any) => void): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const flush = (block: string) => {
    const data = block
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trimStart())
      .join('\n');
    if (!data || data === '[DONE]') return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return; // not JSON (keep-alive or comment)
    }
    onEvent(parsed);
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let cut: number;
    while ((cut = buffer.indexOf('\n\n')) >= 0) {
      flush(buffer.slice(0, cut));
      buffer = buffer.slice(cut + 2);
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) flush(buffer);
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
