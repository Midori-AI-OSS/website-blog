import { afterEach, describe, expect, test } from 'bun:test';
import { TTS_CACHE_VERSION } from '@/lib/tts/contract';
import { GET } from './route';

const originalFetch = globalThis.fetch;
const contentHash = 'a'.repeat(64);
const params = { params: Promise.resolve({ type: 'blog', slug: 'shared-post' }) };

function createRequest(range: string) {
  return {
    headers: new Headers({ range }),
    nextUrl: new URL(
      `https://example.test/api/tts/audio/blog/shared-post?content_hash=${contentHash}&cache_version=${TTS_CACHE_VERSION}`,
    ),
  } as Parameters<typeof GET>[0];
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('/api/tts/audio/[type]/[slug]', () => {
  test('preserves successful partial-content responses and forwards Range', async () => {
    let receivedRange = '';

    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      receivedRange = new Headers(init?.headers).get('range') ?? '';
      return new Response('audio bytes', {
        headers: {
          'accept-ranges': 'bytes',
          'content-range': 'bytes 0-10/100',
          'content-type': 'audio/wav',
        },
        status: 206,
      });
    }) as unknown as typeof fetch;

    const response = await GET(createRequest('bytes=0-10'), params);

    expect(response.status).toBe(206);
    expect(receivedRange).toBe('bytes=0-10');
    expect(response.headers.get('accept-ranges')).toBe('bytes');
    expect(response.headers.get('content-range')).toBe('bytes 0-10/100');
    expect(await response.text()).toBe('audio bytes');
  });

  test('preserves upstream Range metadata for an invalid 416 response', async () => {
    globalThis.fetch = (async () =>
      new Response('invalid range', {
        headers: {
          'accept-ranges': 'bytes',
          'content-range': 'bytes */100',
          'content-type': 'audio/wav',
        },
        status: 416,
      })) as unknown as typeof fetch;

    const response = await GET(createRequest('bytes=100-'), params);

    expect(response.status).toBe(416);
    expect(response.headers.get('accept-ranges')).toBe('bytes');
    expect(response.headers.get('content-range')).toBe('bytes */100');
    expect(await response.text()).toBe('invalid range');
  });
});
