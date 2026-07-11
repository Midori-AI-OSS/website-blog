import { afterEach, describe, expect, test } from 'bun:test';
import { GET } from './route';

const originalFetch = globalThis.fetch;

function createRequest(channel: string) {
  return {
    nextUrl: new URL(`https://example.test/api/radio/current?channel=${channel}`),
  } as Parameters<typeof GET>[0];
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('/api/radio/current', () => {
  test('deduplicates concurrent requests for the same channel', async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    const upstreamFetches: string[] = [];

    globalThis.fetch = ((url: string | URL | Request) => {
      upstreamFetches.push(String(url));

      return new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
    }) as typeof fetch;

    const firstResponsePromise = GET(createRequest('main'));
    const secondResponsePromise = GET(createRequest('main'));

    expect(upstreamFetches).toHaveLength(1);
    expect(upstreamFetches[0]).toContain('channel=main');

    resolveFetch?.(
      new Response('{"track":"shared"}', {
        headers: {
          'content-type': 'application/json',
        },
        status: 200,
      }),
    );

    const [firstResponse, secondResponse] = await Promise.all([
      firstResponsePromise,
      secondResponsePromise,
    ]);

    expect(await firstResponse.text()).toBe('{"track":"shared"}');
    expect(await secondResponse.text()).toBe('{"track":"shared"}');
    expect(firstResponse.headers.get('cache-control')).toBe('no-store, no-cache, must-revalidate');
    expect(secondResponse.headers.get('cache-control')).toBe('no-store, no-cache, must-revalidate');
  });

  test('fetches fresh upstream metadata for later requests', async () => {
    let upstreamFetchCount = 0;

    globalThis.fetch = (() => {
      upstreamFetchCount += 1;

      return Promise.resolve(
        new Response(`{"track":"fresh-${upstreamFetchCount}"}`, {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        }),
      );
    }) as typeof fetch;

    const firstResponse = await GET(createRequest('main'));
    const secondResponse = await GET(createRequest('main'));

    expect(upstreamFetchCount).toBe(2);
    expect(await firstResponse.text()).toBe('{"track":"fresh-1"}');
    expect(await secondResponse.text()).toBe('{"track":"fresh-2"}');
  });
});
