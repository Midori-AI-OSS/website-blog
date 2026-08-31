import { afterEach, describe, expect, test } from 'bun:test';
import {
  getRadioHealth,
  isValidatedRadioHealthEnvelope,
  RADIO_HEALTH_REFRESH_INTERVAL_MS,
  refreshRadioHealth,
  resetRadioHealthManagerForTests,
  startRadioHealthMonitor,
} from './radioHealthManager';

const originalFetch = globalThis.fetch;

function healthResponse(
  data: unknown = { status: 'ready' },
  overrides: Record<string, unknown> = {},
): Response {
  return new Response(
    JSON.stringify({
      version: 'radio.v1',
      ok: true,
      now: '2026-08-31T00:00:00.000Z',
      data,
      error: null,
      ...overrides,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetRadioHealthManagerForTests();
});

describe('radio health manager', () => {
  test('accepts only complete radio.v1 online or offline envelopes', () => {
    expect(isValidatedRadioHealthEnvelope(healthResponse)).toBe(false);
    expect(
      isValidatedRadioHealthEnvelope({
        version: 'radio.v1',
        ok: true,
        now: '2026-08-31T00:00:00.000Z',
        data: { status: 'ready' },
        error: null,
      }),
    ).toBe(true);
    expect(
      isValidatedRadioHealthEnvelope({
        version: 'radio.v1',
        ok: false,
        now: '2026-08-31T00:00:00.000Z',
        data: null,
        error: { code: 'UPSTREAM_UNREACHABLE', message: 'offline' },
      }),
    ).toBe(true);
  });

  test('caches the full validated envelope for later requests', async () => {
    let upstreamFetches = 0;
    globalThis.fetch = (() => {
      upstreamFetches += 1;
      return Promise.resolve(healthResponse({ status: 'ready', track_count: 12 }));
    }) as typeof fetch;

    const first = await getRadioHealth();
    const second = await getRadioHealth();

    expect(first).toEqual(second);
    expect(first.data).toEqual({ status: 'ready', track_count: 12 });
    expect(upstreamFetches).toBe(1);
  });

  test('shares one in-flight startup probe', async () => {
    let upstreamFetches = 0;
    let resolveFetch: ((response: Response) => void) | undefined;
    globalThis.fetch = (() => {
      upstreamFetches += 1;
      return new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
    }) as typeof fetch;

    const first = getRadioHealth();
    const second = getRadioHealth();
    expect(upstreamFetches).toBe(1);

    resolveFetch?.(healthResponse());
    await expect(first).resolves.toMatchObject({ ok: true });
    await expect(second).resolves.toMatchObject({ ok: true });
  });

  test('caches malformed upstream data as offline and does not retry per request', async () => {
    let upstreamFetches = 0;
    globalThis.fetch = (() => {
      upstreamFetches += 1;
      return Promise.resolve(new Response('{"version":"wrong"}', { status: 200 }));
    }) as typeof fetch;

    const first = await getRadioHealth();
    const second = await getRadioHealth();

    expect(first.ok).toBe(false);
    expect(first.error?.code).toBe('UPSTREAM_UNHEALTHY');
    expect(second).toEqual(first);
    expect(upstreamFetches).toBe(1);
  });

  test('caches a timed-out upstream probe as offline', async () => {
    const originalSetTimeout = globalThis.setTimeout;
    let upstreamFetches = 0;
    globalThis.fetch = ((_input, init) => {
      upstreamFetches += 1;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    }) as typeof fetch;
    globalThis.setTimeout = ((callback: TimerHandler, delay?: number) => {
      expect(delay).toBe(5_500);
      queueMicrotask(() => {
        if (typeof callback === 'function') {
          callback();
        }
      });
      return 1 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof globalThis.setTimeout;

    try {
      const first = await getRadioHealth();
      const second = await getRadioHealth();

      expect(first).toMatchObject({
        ok: false,
        data: null,
        error: { code: 'UPSTREAM_TIMEOUT' },
      });
      expect(second).toEqual(first);
      expect(upstreamFetches).toBe(1);
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  test('refreshes the existing cache through the shared probe', async () => {
    let upstreamFetches = 0;
    globalThis.fetch = (() => {
      upstreamFetches += 1;
      return Promise.resolve(healthResponse({ status: `ready-${upstreamFetches}` }));
    }) as typeof fetch;

    await startRadioHealthMonitor();
    await refreshRadioHealth();

    expect(upstreamFetches).toBe(2);
    expect((await getRadioHealth()).data).toEqual({ status: 'ready-2' });
  });

  test('refreshes the cache from the scheduled thirty-minute timer', async () => {
    const originalSetInterval = globalThis.setInterval;
    const responses = [
      healthResponse({ status: 'ready-1' }),
      healthResponse({ status: 'ready-2' }),
    ];
    let upstreamFetches = 0;
    let scheduledRefresh: (() => void) | undefined;
    globalThis.fetch = (() => {
      const response = responses[upstreamFetches];
      upstreamFetches += 1;
      return Promise.resolve(response ?? healthResponse({ status: 'ready-later' }));
    }) as typeof fetch;
    globalThis.setInterval = ((callback: TimerHandler, delay?: number) => {
      expect(delay).toBe(RADIO_HEALTH_REFRESH_INTERVAL_MS);
      if (typeof callback === 'function') {
        scheduledRefresh = callback;
      }
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as typeof globalThis.setInterval;

    try {
      await startRadioHealthMonitor();
      scheduledRefresh?.();
      await refreshRadioHealth();

      expect(upstreamFetches).toBe(2);
      expect((await getRadioHealth()).data).toEqual({ status: 'ready-2' });
    } finally {
      globalThis.setInterval = originalSetInterval;
    }
  });
});
