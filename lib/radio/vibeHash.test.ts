import { describe, expect, test } from 'bun:test';
import {
  cyrb53,
  createRng,
  hashToSeeds,
  sceneCount,
  sceneForPosition,
  visualIdentitySeed,
} from './vibeHash';

describe('sceneCount', () => {
  test('returns 1 for non-positive or zero duration', () => {
    expect(sceneCount(0)).toBe(1);
    expect(sceneCount(-1)).toBe(1);
  });

  test('returns 1 for durations under 60 seconds', () => {
    expect(sceneCount(1000)).toBe(1);
    expect(sceneCount(59_000)).toBe(1);
  });

  test('returns correct scene count per minute boundaries', () => {
    expect(sceneCount(60_000)).toBe(1);
    expect(sceneCount(60_001)).toBe(1);
    expect(sceneCount(119_999)).toBe(1);
    expect(sceneCount(120_000)).toBe(2);
    expect(sceneCount(180_000)).toBe(3);
    expect(sceneCount(300_000)).toBe(5);
  });
});

describe('sceneForPosition', () => {
  test('returns 0 for non-positive duration', () => {
    expect(sceneForPosition(0, 0)).toBe(0);
    expect(sceneForPosition(50_000, 0)).toBe(0);
  });

  test('stays at scene 0 within first minute of a long track', () => {
    expect(sceneForPosition(0, 180_000)).toBe(0);
    expect(sceneForPosition(59_000, 180_000)).toBe(0);
  });

  test('advances scene at boundaries', () => {
    expect(sceneForPosition(60_000, 180_000)).toBe(1);
    expect(sceneForPosition(119_999, 180_000)).toBe(1);
    expect(sceneForPosition(120_000, 180_000)).toBe(2);
  });

  test('clamps at last scene near end', () => {
    expect(sceneForPosition(179_999, 180_000)).toBe(2);
    expect(sceneForPosition(180_000, 180_000)).toBe(2);
    expect(sceneForPosition(200_000, 180_000)).toBe(2);
  });

  test('negative position maps to scene 0', () => {
    expect(sceneForPosition(-5000, 60_000)).toBe(0);
  });
});

describe('visualIdentitySeed', () => {
  test('produces deterministic output', () => {
    const a = visualIdentitySeed('abc', '2024-01-01T00:00:00Z', 'dark ambient', 0);
    const b = visualIdentitySeed('abc', '2024-01-01T00:00:00Z', 'dark ambient', 0);
    expect(a).toBe(b);
  });

  test('different track produces different seed', () => {
    const a = visualIdentitySeed('a', 't', 'v', 0);
    const b = visualIdentitySeed('b', 't', 'v', 0);
    expect(a).not.toBe(b);
  });

  test('different startedAt produces different seed', () => {
    const a = visualIdentitySeed('a', 't1', 'v', 0);
    const b = visualIdentitySeed('a', 't2', 'v', 0);
    expect(a).not.toBe(b);
  });

  test('different scene produces different seed', () => {
    const a = visualIdentitySeed('a', 't', 'v', 0);
    const b = visualIdentitySeed('a', 't', 'v', 1);
    expect(a).not.toBe(b);
  });
});

describe('cyrb53', () => {
  test('same input yields same hash', () => {
    expect(cyrb53('hello')).toBe(cyrb53('hello'));
  });

  test('different inputs produce different hashes', () => {
    expect(cyrb53('hello')).not.toBe(cyrb53('world'));
  });
});

describe('hashToSeeds', () => {
  test('returns expected count', () => {
    const seeds = hashToSeeds(12345, 5);
    expect(seeds).toHaveLength(5);
  });
});

describe('createRng', () => {
  test('produces deterministic sequence', () => {
    const rng1 = createRng(42);
    const rng2 = createRng(42);
    for (let i = 0; i < 10; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  test('values are in [0, 1)', () => {
    const rng = createRng(123);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
