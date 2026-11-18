import { Platform } from 'react-native';
import { app, auth } from '../../config/firebase';

/**
 * Streams a reply from the `aiChat` callable, so the answer appears as it is
 * written instead of all at once.
 *
 * This speaks the callable streaming protocol directly (POST with
 * `Accept: text/event-stream`; the server sends `{"message": chunk}` events and
 * then one `{"result": …}` or `{"error": …}`) because the Firebase SDK's
 * `.stream()` needs a fetch that can read a response body as it arrives, and
 * React Native's built-in fetch can't. `expo/fetch` can, so it's used on
 * phones; the browser's own fetch is used on web.
 *
 * Chunks from the server: `{ t }` appends text, `{ reset: true }` clears what
 * was sent so far (the server's model fallback took over). The final result
 * is always the complete reply and is what gets saved.
 */

export interface AiChatPayload {
  messages: { role: string; content: string; images?: { base64: string; mimeType: string }[] }[];
  babyId?: string;
}

export interface AiChatResult {
  content: string;
  urgent?: boolean;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  aiUsage?: { messagesUsedThisPeriod: number; limit: number; tier: 'free' | 'premium' };
}

/** Thrown before anything reached the server: the caller may safely retry without streaming. */
export class StreamUnavailableError extends Error {}

/** The callable failed on the server (limits, validation, provider down): show `message` as-is. */
export class AiChatError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

const REGION = 'us-central1';

type FetchLike = (url: string, init: any) => Promise<{
  ok: boolean;
  status: number;
  body?: { getReader(): { read(): Promise<{ value?: Uint8Array; done: boolean }>; cancel?(): Promise<void> } } | null;
  text(): Promise<string>;
}>;

function streamingFetch(): FetchLike | null {
  if (Platform.OS === 'web') return typeof fetch === 'function' ? (fetch as unknown as FetchLike) : null;
  try {
    // Lazy: keeps tests and old dev clients without the module working.
    return (require('expo/fetch') as { fetch: FetchLike }).fetch;
  } catch {
    return null;
  }
}

/** Streaming only talks to the deployed function; the emulator uses the normal call. */
export function canStreamAiChat(): boolean {
  return process.env.EXPO_PUBLIC_USE_EMULATOR !== '1' && !!streamingFetch();
}

export async function streamAiChat(
  payload: AiChatPayload,
  onText: (fullText: string) => void,
  { signal }: { signal?: AbortSignal } = {}
): Promise<AiChatResult> {
  const doFetch = streamingFetch();
  const user = auth.currentUser;
  if (!doFetch) throw new StreamUnavailableError('Streaming fetch is not available');
  if (!user) throw new AiChatError('You must be signed in to use the AI assistant.', 'unauthenticated');

  let token: string;
  try {
    token = await user.getIdToken();
  } catch {
    throw new StreamUnavailableError('Could not get a sign-in token');
  }

  const url = `https://${REGION}-${app.options.projectId}.cloudfunctions.net/aiChat`;
  let res: Awaited<ReturnType<FetchLike>>;
  try {
    res = await doFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ data: payload }),
      signal,
    });
  } catch (e) {
    // Nothing reached the function (offline, DNS, TLS): no message was counted.
    throw new StreamUnavailableError(e instanceof Error ? e.message : 'Network error');
  }

  if (!res.body) {
    // The request went through but we can't read it as a stream; read it whole.
    return parseWholeBody(await res.text());
  }

  let text = '';
  let result: AiChatResult | null = null;
  let failure: AiChatError | null = null;

  const handle = (raw: string) => {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg && 'message' in msg) {
      const chunk = msg.message ?? {};
      if (chunk.reset) text = '';
      if (typeof chunk.t === 'string') text += chunk.t;
      onText(text);
    } else if (msg && 'result' in msg) {
      result = msg.result as AiChatResult;
    } else if (msg && 'error' in msg) {
      failure = toError(msg.error);
    }
  };

  await readEventStream(res.body, handle);

  if (failure) throw failure;
  if (!result) {
    if (!res.ok) throw new AiChatError('The assistant is unavailable right now. Please try again shortly.', 'unavailable');
    throw new AiChatError('The reply was cut off. Please try again.', 'unavailable');
  }
  return result;
}

/** Splits an SSE body into `data:` payloads. */
export async function readEventStream(
  body: { getReader(): { read(): Promise<{ value?: Uint8Array; done: boolean }> } },
  onData: (data: string) => void
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const flush = (block: string) => {
    const data = block
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trimStart())
      .join('\n');
    if (data) onData(data);
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let cut: number;
    while ((cut = buffer.indexOf('\n\n')) >= 0) {
      flush(buffer.slice(0, cut));
      buffer = buffer.slice(cut + 2);
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) flush(buffer);
}

/** A non-streamed body (server ignored the Accept header, or an HTTP error page). */
function parseWholeBody(raw: string): AiChatResult {
  let json: any;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new AiChatError('The assistant is unavailable right now. Please try again shortly.', 'unavailable');
  }
  if (json?.error) throw toError(json.error);
  if (json?.result) return json.result as AiChatResult;
  throw new AiChatError('The assistant is unavailable right now. Please try again shortly.', 'unavailable');
}

function toError(err: any): AiChatError {
  const status = typeof err?.status === 'string' ? err.status.toLowerCase().replace(/_/g, '-') : undefined;
  return new AiChatError(
    typeof err?.message === 'string' && err.message ? err.message : 'The assistant is unavailable right now. Please try again shortly.',
    status
  );
}
