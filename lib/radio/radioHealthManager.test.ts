import { afterEach, describe, expect, test } from 'bun:test';
import type { HealthPayload } from './contract';
import {
  getRadioHealth,
  isValidatedRadioHealthEnvelope,
  RADIO_HEALTH_REFRESH_INTERVAL_MS,
  refreshRadioHealth,
  resetRadioHealthManagerForTests,
  startRadioHealthMonitor,
} from './radioHealthManager';

const originalFetch = globalThis.fetch;

const DEFAULT_HEALTH: HealthPayload = {
  status: 'ready',
  warmup_active: false,
  track_count: 12,
  cached_tracks: 8,
  cached_bytes: 2_048,
};

function healthResponse(
  runtimeOverrides: Partial<HealthPayload> = {},
  overrides: Record<string, unknown> = {},
  httpStatus = 200,
): Response {
  return new Response(
    JSON.stringify({
      version: 'radio.health.v1',
      ok: true,
      now: '2026-08-31T00:00:00.000Z',
      data: {
        name: 'radio',
        status: 'healthy',
        data: { ...DEFAULT_HEALTH, ...runtimeOverrides },
      },
      error: null,
      ...overrides,
    }),
    { status: httpStatus, headers: { 'content-type': 'application/json' } },
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

  test('requests the radio component endpoint and normalizes it for later consumers', async () => {
    let upstreamFetches = 0;
    globalThis.fetch = ((input) => {
      expect(String(input)).toBe('https://radio.midori-ai.xyz/radio/health');
      upstreamFetches += 1;
      return Promise.resolve(healthResponse());
    }) as typeof fetch;

    const first = await getRadioHealth();
    const second = await getRadioHealth();

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      version: 'radio.v1',
      ok: true,
      data: DEFAULT_HEALTH,
      error: null,
    });
    expect(upstreamFetches).toBe(1);
  });

  test('reports a warming radio as offline while retaining its diagnostic message', async () => {
    globalThis.fetch = (() =>
      Promise.resolve(
        healthResponse(
          { status: 'warming', warmup_active: true },
          {
            ok: false,
            data: {
              name: 'radio',
              status: 'starting',
              data: { ...DEFAULT_HEALTH, status: 'warming', warmup_active: true },
            },
          },
          503,
        ),
      )) as typeof fetch;

    await expect(getRadioHealth()).resolves.toMatchObject({
      version: 'radio.v1',
      ok: false,
      data: null,
      error: { code: 'RADIO_STARTING', message: 'Radio is starting' },
    });
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
      return Promise.resolve(healthResponse({ track_count: upstreamFetches }));
    }) as typeof fetch;

    await startRadioHealthMonitor();
    await refreshRadioHealth();

    expect(upstreamFetches).toBe(2);
    expect((await getRadioHealth()).data).toMatchObject({ track_count: 2 });
  });

  test('refreshes the cache from the scheduled thirty-minute timer', async () => {
    const originalSetInterval = globalThis.setInterval;
    const responses = [healthResponse({ track_count: 1 }), healthResponse({ track_count: 2 })];
    let upstreamFetches = 0;
    let scheduledRefresh: (() => void) | undefined;
    globalThis.fetch = (() => {
      const response = responses[upstreamFetches];
      upstreamFetches += 1;
      return Promise.resolve(response ?? healthResponse({ track_count: 3 }));
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
      expect((await getRadioHealth()).data).toMatchObject({ track_count: 2 });
    } finally {
      globalThis.setInterval = originalSetInterval;
    }
  });

  test('reports the actual unsupported endpoint version in its error', async () => {
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            version: 'webserver.health.v1',
            ok: true,
            now: '2026-08-31T00:00:00.000Z',
            data: {},
            error: null,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )) as typeof fetch;

    const result = await getRadioHealth();

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('UPSTREAM_UNHEALTHY');
    expect(result.error?.message).toContain('webserver.health.v1');
    expect(result.error?.message).not.toBe('Radio health returned HTTP 200');
  });
});
