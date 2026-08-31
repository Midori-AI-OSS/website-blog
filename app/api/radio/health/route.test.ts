import { afterEach, describe, expect, test } from 'bun:test';
import { GET, RADIO_HEALTH_UPSTREAM_TIMEOUT_MS } from './route';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('/api/radio/health', () => {
  test('allows an upstream health response that arrives after the old three-second budget', async () => {
    globalThis.fetch = ((_input, init) =>
      new Promise<Response>((resolve, reject) => {
        const responseTimer = setTimeout(
          () =>
            resolve(
              new Response(
                JSON.stringify({
                  version: 'radio.v1',
                  ok: true,
                  now: '2026-08-31T00:00:00.000Z',
                  data: { status: 'ready' },
                  error: null,
                }),
                { status: 200, headers: { 'content-type': 'application/json' } },
              ),
            ),
          4_000,
        );
        init?.signal?.addEventListener('abort', () => {
          clearTimeout(responseTimer);
          reject(new DOMException('aborted', 'AbortError'));
        });
      })) as typeof fetch;

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ version: 'radio.v1', ok: true });
  });

  test('uses a five-and-a-half-second upstream health budget', () => {
    expect(RADIO_HEALTH_UPSTREAM_TIMEOUT_MS).toBe(5_500);
  });

  test('returns a validated upstream success envelope without caching', async () => {
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            version: 'radio.v1',
            ok: true,
            now: '2026-08-24T00:00:00.000Z',
            data: { status: 'ready' },
            error: null,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )) as typeof fetch;

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ version: 'radio.v1', ok: true });
    expect(response.headers.get('cache-control')).toBe('no-store, no-cache, must-revalidate');
  });

  test('returns a radio.v1 502 envelope for malformed upstream data', async () => {
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response(JSON.stringify({ version: 'wrong', ok: true, data: {} }), { status: 200 }),
      )) as typeof fetch;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toMatchObject({
      version: 'radio.v1',
      ok: false,
      data: null,
      error: { code: 'UPSTREAM_UNHEALTHY' },
    });
  });

  test('returns a radio.v1 502 envelope when upstream fetch fails', async () => {
    globalThis.fetch = (() => Promise.reject(new Error('radio offline'))) as typeof fetch;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toMatchObject({
      version: 'radio.v1',
      ok: false,
      data: null,
      error: { code: 'UPSTREAM_UNREACHABLE', message: 'radio offline' },
    });
  });
});
