import { describe, expect, test } from 'bun:test';
import {
  hasRadioOfflineLatch,
  isSuccessfulRadioHealthEnvelope,
  radioOfflineStorageKey,
  setRadioOfflineLatch,
} from './availability';

function envelope(data: unknown, overrides: Record<string, unknown> = {}) {
  return {
    version: 'radio.v1',
    ok: true,
    now: '2026-08-24T00:00:00.000Z',
    data,
    error: null,
    ...overrides,
  };
}

describe('radio availability helpers', () => {
  test('requires the radio.v1 success envelope and non-null data', () => {
    expect(isSuccessfulRadioHealthEnvelope(envelope({ status: 'ready' }))).toBe(true);
    expect(isSuccessfulRadioHealthEnvelope(envelope(null))).toBe(false);
    expect(isSuccessfulRadioHealthEnvelope(envelope({ status: 'ready' }, { ok: false }))).toBe(
      false,
    );
    expect(
      isSuccessfulRadioHealthEnvelope(envelope({ status: 'ready' }, { version: 'other' })),
    ).toBe(false);
  });

  test('latches only the current browser/build key and ignores older build ids', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };

    setRadioOfflineLatch(storage, 'build-a');

    expect(values.get(radioOfflineStorageKey('build-a'))).toBe('true');
    expect(hasRadioOfflineLatch(storage, 'build-a')).toBe(true);
    expect(hasRadioOfflineLatch(storage, 'build-b')).toBe(false);
  });
});
