import { describe, expect, test } from 'bun:test';
import {
  checkRadioHealth,
  createBuildRadioStatus,
  RADIO_HEALTH_TIMEOUT_MS,
} from './build-with-radio-check';

function successfulEnvelope(data: unknown = { status: 'ready' }): Response {
  return new Response(
    JSON.stringify({
      version: 'radio.v1',
      ok: true,
      now: new Date().toISOString(),
      data,
      error: null,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

describe('build radio health check', () => {
  test('accepts a radio.v1 success envelope with data', async () => {
    const result = await checkRadioHealth('https://radio.test/health', RADIO_HEALTH_TIMEOUT_MS, () =>
      Promise.resolve(successfulEnvelope()),
    );

    expect(result).toEqual({ available: true, reason: null });
  });

  test('disables radio for HTTP failures and malformed envelopes', async () => {
    const httpFailure = await checkRadioHealth('https://radio.test/health', 50, () =>
      Promise.resolve(new Response('{}', { status: 503 })),
    );
    const malformed = await checkRadioHealth('https://radio.test/health', 50, () =>
      Promise.resolve(new Response(JSON.stringify({ version: 'radio.v1', ok: true, data: null }))),
    );

    expect(httpFailure.available).toBe(false);
    expect(httpFailure.reason).toBe('radio-health-http-503');
    expect(malformed).toEqual({ available: false, reason: 'radio-health-invalid-envelope' });
  });

  test('hard-stops a health request at the timeout', async () => {
    const result = await checkRadioHealth('https://radio.test/health', 5, (_url, init) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    });

    expect(result).toEqual({ available: false, reason: 'radio-health-timeout' });
  });

  test('writes the availability, build id, timestamp, and reason fields', () => {
    const status = createBuildRadioStatus(
      'build-123',
      'http://127.0.0.1:9/health',
      { available: false, reason: 'radio-health-timeout' },
      '2026-08-24T00:00:00.000Z',
    );

    expect(status).toEqual({
      available: false,
      build_id: 'build-123',
      checked_at: '2026-08-24T00:00:00.000Z',
      reason: 'radio-health-timeout',
      health_url: 'http://127.0.0.1:9/health',
    });
  });
});
