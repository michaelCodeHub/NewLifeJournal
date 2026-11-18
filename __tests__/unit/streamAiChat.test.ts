/**
 * The streaming client for aiChat: reads the callable's SSE stream, builds the
 * reply as it arrives, honours `reset`, and surfaces server errors as-is.
 */
import { TextEncoder as NodeTextEncoder, TextDecoder as NodeTextDecoder } from 'util';

Object.assign(globalThis, { TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder });

const mockFetch = jest.fn();
jest.mock('expo/fetch', () => ({ fetch: (...args: unknown[]) => mockFetch(...args) }), { virtual: true });
jest.mock('../../config/firebase', () => ({
  app: { options: { projectId: 'demo-project' } },
  auth: { currentUser: { getIdToken: jest.fn(async () => 'id-token') } },
}));

import { AiChatError, StreamUnavailableError, readEventStream, streamAiChat } from '../../services/ai/streamAiChat';

/** A response body that hands out the given pieces one read at a time. */
function bodyOf(pieces: string[]) {
  const enc = new NodeTextEncoder();
  let i = 0;
  return {
    getReader: () => ({
      read: async () => (i < pieces.length ? { value: enc.encode(pieces[i++]), done: false } : { value: undefined, done: true }),
    }),
  };
}

const sse = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`;
const payload = { messages: [{ role: 'user', content: 'hi' }] };

beforeEach(() => mockFetch.mockReset());

it('posts to the deployed function as a stream request with the user token', async () => {
  mockFetch.mockResolvedValue({ ok: true, status: 200, body: bodyOf([sse({ result: { content: 'ok' } })]), text: jest.fn() });
  await streamAiChat(payload, () => {});
  const [url, init] = mockFetch.mock.calls[0];
  expect(url).toBe('https://us-central1-demo-project.cloudfunctions.net/aiChat');
  expect(init.headers).toMatchObject({ Accept: 'text/event-stream', Authorization: 'Bearer id-token' });
  expect(JSON.parse(init.body)).toEqual({ data: payload });
});

it('builds the reply chunk by chunk, even when events are split across reads', async () => {
  const stream = sse({ message: { t: 'Hel' } }) + sse({ message: { t: 'lo **there**' } }) + sse({ result: { content: 'Hello **there**', aiUsage: { tier: 'premium' } } });
  // Cut the bytes at awkward places.
  const pieces = [stream.slice(0, 7), stream.slice(7, 40), stream.slice(40)];
  mockFetch.mockResolvedValue({ ok: true, status: 200, body: bodyOf(pieces), text: jest.fn() });

  const seen: string[] = [];
  const result = await streamAiChat(payload, (t) => seen.push(t));
  expect(seen).toEqual(['Hel', 'Hello **there**']);
  expect(result).toMatchObject({ content: 'Hello **there**', aiUsage: { tier: 'premium' } });
});

it('starts over on reset (the server fallback took over)', async () => {
  const stream = sse({ message: { t: 'partial' } }) + sse({ message: { reset: true } }) + sse({ message: { t: 'fresh' } }) + sse({ result: { content: 'fresh' } });
  mockFetch.mockResolvedValue({ ok: true, status: 200, body: bodyOf([stream]), text: jest.fn() });
  const seen: string[] = [];
  await streamAiChat(payload, (t) => seen.push(t));
  expect(seen).toEqual(['partial', '', 'fresh']);
});

it('throws the server message for a callable error (e.g. the free limit)', async () => {
  const stream = sse({ error: { status: 'RESOURCE_EXHAUSTED', message: "You've used all 15 free AI messages this month." } });
  mockFetch.mockResolvedValue({ ok: true, status: 200, body: bodyOf([stream]), text: jest.fn() });
  const err = await streamAiChat(payload, () => {}).catch((e) => e);
  expect(err).toBeInstanceOf(AiChatError);
  expect(err.message).toBe("You've used all 15 free AI messages this month.");
  expect(err.code).toBe('resource-exhausted');
});

it('reports a cut-off stream as an error, not as an empty reply', async () => {
  mockFetch.mockResolvedValue({ ok: true, status: 200, body: bodyOf([sse({ message: { t: 'half' } })]), text: jest.fn() });
  await expect(streamAiChat(payload, () => {})).rejects.toBeInstanceOf(AiChatError);
});

it('marks network failures as safe to retry without streaming', async () => {
  mockFetch.mockRejectedValue(new Error('Network request failed'));
  await expect(streamAiChat(payload, () => {})).rejects.toBeInstanceOf(StreamUnavailableError);
});

it('reads a whole (non-streamed) body when there is no readable stream', async () => {
  mockFetch.mockResolvedValue({ ok: true, status: 200, body: null, text: async () => JSON.stringify({ result: { content: 'whole' } }) });
  await expect(streamAiChat(payload, () => {})).resolves.toMatchObject({ content: 'whole' });
});

it('readEventStream joins multi-line data and ignores other fields', async () => {
  const got: string[] = [];
  await readEventStream(bodyOf(['event: x\r\ndata: a\r\ndata: b\r\n\r\n', ': comment\n\n', 'data: tail']), (d) => got.push(d));
  expect(got).toEqual(['a\nb', 'tail']);
});
