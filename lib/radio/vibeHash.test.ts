import { describe, expect, test } from 'bun:test';
import { VIBE_EFFECTS } from './vibeEffects';
import {
  createRng,
  cyrb53,
  hashToSeeds,
  isWireframeEffectName,
  sceneCount,
  sceneForPosition,
  selectSceneEffects,
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

describe('isWireframeEffectName', () => {
  test('matches all eight named wireframe effects', () => {
    const wireframes = VIBE_EFFECTS.map((e) => e.name).filter((n) => n.startsWith('wireframe'));
    expect(wireframes).toHaveLength(8);
    for (const name of wireframes) {
      expect(isWireframeEffectName(name)).toBe(true);
    }
  });

  test('does not match spirals or other effects', () => {
    expect(isWireframeEffectName('spiralVortex')).toBe(false);
    expect(isWireframeEffectName('roseSpiral')).toBe(false);
    expect(isWireframeEffectName('floatingOrbs')).toBe(false);
    expect(isWireframeEffectName('auroraRibbons')).toBe(false);
  });
});

describe('selectSceneEffects', () => {
  // Representative seeds: plain strings, vibe text, and realistic
  // visualIdentitySeed outputs across tracks, timestamps, and scenes.
  const representativeSeeds: string[] = [
    'a',
    'seed-1',
    'cosmos',
    'dark ambient',
    '12345',
    visualIdentitySeed('track-a', '2026-07-31T10:00:00.000Z', 'chill', 0),
    visualIdentitySeed('track-a', '2026-07-31T10:00:00.000Z', 'chill', 2),
    visualIdentitySeed('track-b', '2026-07-31T12:30:00.000Z', 'powerful', 1),
    visualIdentitySeed('track-c', '2026-08-01T08:15:00.000Z', 'dark ambient', 0),
    visualIdentitySeed('track-c', '2026-08-01T08:15:00.000Z', 'dark ambient', 1),
    visualIdentitySeed('track-d', '2026-08-01T09:45:00.000Z', 'ethereal', 3),
    'vibe:lofi:2026-07-01T00:00:00.000Z',
    'vibe:energetic:2026-07-02T00:00:00.000Z',
    't1:s0:v0',
    't2:s5:v9',
    'track-1:2026-07-31T10:00:00.000Z:dark ambient:s0',
    'track-2:2026-07-31T11:00:00.000Z:chill:s1',
    'track-3:2026-07-31T12:00:00.000Z:powerful:s2',
    'track-4:2026-07-31T13:00:00.000Z:ethereal:s0',
    'track-5:2026-07-31T14:00:00.000Z:driving:s1',
    'track-6:2026-07-31T15:00:00.000Z:ambient:s0',
    'track-7:2026-07-31T16:00:00.000Z:hype:s2',
    'track-8:2026-07-31T17:00:00.000Z:dreamy:s1',
    'track-9:2026-07-31T18:00:00.000Z:heavy:s0',
    'track-10:2026-07-31T19:00:00.000Z:lofi:s3',
  ];

  // Mirrors the selection pattern used by buildVibeScene.
  function selectForSeed(seed: string) {
    const rng = createRng(cyrb53(seed));
    return selectSceneEffects(VIBE_EFFECTS, rng, 2 + Math.floor(rng() * 2));
  }

  test('every scene has 2-3 unique effects across representative seeds', () => {
    for (const seed of representativeSeeds) {
      const scene = selectForSeed(seed);
      expect(scene.length).toBeGreaterThanOrEqual(2);
      expect(scene.length).toBeLessThanOrEqual(3);
      const names = scene.map((e) => e.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  test('every scene contains at most one named wireframe effect', () => {
    for (const seed of representativeSeeds) {
      const scene = selectForSeed(seed);
      const wireframeCount = scene.filter((e) => isWireframeEffectName(e.name)).length;
      expect(wireframeCount, `seed ${seed}`).toBeLessThanOrEqual(1);
    }
  });

  test('selection is deterministic for the same seed', () => {
    for (const seed of representativeSeeds) {
      const first = selectForSeed(seed).map((e) => e.name);
      const second = selectForSeed(seed).map((e) => e.name);
      expect(first).toEqual(second);
    }
  });

  test('spiral effects remain selectable and are not treated as wireframes', () => {
    let foundSpiral = false;
    for (let i = 0; i < 500 && !foundSpiral; i++) {
      const scene = selectForSeed(`spiral-probe-${i}`);
      expect(scene.filter((e) => isWireframeEffectName(e.name)).length).toBeLessThanOrEqual(1);
      if (scene.some((e) => e.name === 'spiralVortex' || e.name === 'roseSpiral')) {
        foundSpiral = true;
      }
    }
    expect(foundSpiral).toBe(true);
  });

  test('non-wireframe pool alone can fill the requested count', () => {
    const rng = createRng(1);
    const scene = selectSceneEffects(VIBE_EFFECTS, rng, 3);
    expect(scene).toHaveLength(3);
  });
});
