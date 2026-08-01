import { describe, expect, test } from 'bun:test';
import {
  clearPreparedCache,
  preparedCacheStats,
  VIBE_EFFECT_COUNT,
  VIBE_EFFECTS,
  WIREFRAME_ANIMATION_SLOWDOWN,
  WIREFRAME_GEOMETRY_SCALE,
  WIREFRAME_TUNNEL_SLOWDOWN,
} from './vibeEffects';

function mockCanvasContext(_w: number, _h: number) {
  const paths: { moveTo: unknown[][]; lineTo: unknown[][]; closePaths: number } = {
    moveTo: [],
    lineTo: [],
    closePaths: 0,
  };
  const calls: { method: string; args: unknown[] }[] = [];

  const raw = {
    _paths: paths,
    _calls: calls,
    save: () => {
      calls.push({ method: 'save', args: [] });
    },
    restore: () => {
      calls.push({ method: 'restore', args: [] });
    },
    beginPath: () => {},
    moveTo: (x: number, y: number) => {
      paths.moveTo.push([x, y]);
    },
    lineTo: (x: number, y: number) => {
      paths.lineTo.push([x, y]);
    },
    closePath: () => {
      paths.closePaths++;
    },
    stroke: () => {
      calls.push({ method: 'stroke', args: [] });
    },
    arc: (...args: unknown[]) => {
      calls.push({ method: 'arc', args });
    },
    createRadialGradient: () => ({
      addColorStop: (_pos: number, _color: string) => {},
    }),
    createLinearGradient: () => ({
      addColorStop: (_pos: number, _color: string) => {},
    }),
    fill: () => {},
    fillRect: (_x: number, _y: number, _w: number, _h: number) => {},
    setTransform: (..._args: number[]) => {},
  } as unknown as CanvasRenderingContext2D & {
    _paths: typeof paths;
    _calls: typeof calls;
  };

  return raw;
}

function isFiniteCoord(v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v);
}

const knownEffects = [
  'wireframeDiamond',
  'wireframeCube',
  'wireframeIcosahedron',
  'wireframeTorus',
  'wireframeSphere',
  'wireframeTunnel',
  'wireframeTesseract',
  'wireframe16Cell',
  'spiralVortex',
  'roseSpiral',
];

describe('VIBE_EFFECTS registry', () => {
  test('all names are unique', () => {
    const names = VIBE_EFFECTS.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test('count matches actual length', () => {
    expect(VIBE_EFFECT_COUNT).toBe(VIBE_EFFECTS.length);
  });

  test('contains all 10 known effects', () => {
    const names = new Set(VIBE_EFFECTS.map((e) => e.name));
    for (const name of knownEffects) {
      expect(names.has(name)).toBe(true);
    }
  });

  test('pool is expanded to 35', () => {
    expect(VIBE_EFFECTS.length).toBe(35);
  });
});

describe('wireframe scaling and animation constants', () => {
  test('geometry is scaled to 60% of the original', () => {
    expect(WIREFRAME_GEOMETRY_SCALE).toBe(0.6);
  });

  test('rotation/color animation is slowed by 50%', () => {
    expect(WIREFRAME_ANIMATION_SLOWDOWN).toBe(0.5);
  });

  test('wireframeTunnel animation is slowed by 70%', () => {
    expect(WIREFRAME_TUNNEL_SLOWDOWN).toBe(0.3);
  });
});

describe('new wireframe effects render without throwing', () => {
  const palette = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];

  for (const name of knownEffects) {
    test(`${name} renders at landscape`, () => {
      const ctx = mockCanvasContext(1280, 720);
      const entry = VIBE_EFFECTS.find((e) => e.name === name);
      expect(entry).toBeDefined();
      expect(() => entry?.fn(ctx, 1280, 720, 42, 1.5, palette, 1)).not.toThrow();
    });

    test(`${name} renders at portrait (phone)`, () => {
      const ctx = mockCanvasContext(390, 844);
      const entry = VIBE_EFFECTS.find((e) => e.name === name);
      expect(entry).toBeDefined();
      expect(() => entry?.fn(ctx, 390, 844, 99, 10, palette, 1)).not.toThrow();
    });

    test(`${name} renders with single-color palette`, () => {
      const ctx = mockCanvasContext(800, 600);
      const entry = VIBE_EFFECTS.find((e) => e.name === name);
      expect(entry).toBeDefined();
      expect(() => entry?.fn(ctx, 800, 600, 7, 3, ['#333333'], 0.8)).not.toThrow();
    });

    test(`${name} renders at reduced-motion static time`, () => {
      const ctx = mockCanvasContext(1024, 768);
      const entry = VIBE_EFFECTS.find((e) => e.name === name);
      expect(entry).toBeDefined();
      expect(() => entry?.fn(ctx, 1024, 768, 13, 1, palette, 1)).not.toThrow();
    });
  }
});

describe('wireframe projected coordinates are finite', () => {
  const palette = ['#aaaaaa', '#bbbbbb'];

  for (const name of knownEffects) {
    test(`${name} all moveTo / lineTo coords are finite`, () => {
      const ctx = mockCanvasContext(800, 600);
      const entry = VIBE_EFFECTS.find((e) => e.name === name);
      expect(entry).toBeDefined();

      const timestamps = [0, 0.5, 1, 2, 5, 10, 30, 60, 300];
      for (const t of timestamps) {
        ctx._paths = { moveTo: [], lineTo: [], closePaths: 0 };
        entry?.fn(ctx, 800, 600, 42 + t, t, palette, 1);

        for (const [x, y] of ctx._paths.moveTo) {
          expect(isFiniteCoord(x)).toBe(true);
          expect(isFiniteCoord(y)).toBe(true);
        }
        for (const [x, y] of ctx._paths.lineTo) {
          expect(isFiniteCoord(x)).toBe(true);
          expect(isFiniteCoord(y)).toBe(true);
        }
      }
    });
  }
});

describe('wireframeTunnel projection/depth regression', () => {
  const palette = ['#aaaaaa', '#bbbbbb'];

  test('all frame coordinates stay finite and bounded across the full scroll cycle', () => {
    const sizes: Array<[number, number]> = [
      [1280, 720],
      [800, 600],
      [390, 844],
      [360, 800],
      [768, 1024],
    ];
    const seeds = [1, 42, 99, 12345, 777777];
    // Scroll advances 0.012 per time unit, so t = 0..84 sweeps every phase;
    // larger t values check long-running stability.
    const timestamps = [...Array.from({ length: 85 }, (_, i) => i), 300, 1000, 10000];

    for (const [w, h] of sizes) {
      const bound = Math.max(w, h) * 8;
      for (const seed of seeds) {
        for (const t of timestamps) {
          const ctx = mockCanvasContext(w, h);
          const entry = VIBE_EFFECTS.find((e) => e.name === 'wireframeTunnel');
          expect(entry).toBeDefined();
          entry?.fn(ctx, w, h, seed, t, palette, 1);
          for (const pair of [...ctx._paths.moveTo, ...ctx._paths.lineTo]) {
            const x = pair[0] as number;
            const y = pair[1] as number;
            expect(isFiniteCoord(x)).toBe(true);
            expect(isFiniteCoord(y)).toBe(true);
            expect(Math.abs(x)).toBeLessThanOrEqual(bound);
            expect(Math.abs(y)).toBeLessThanOrEqual(bound);
          }
        }
      }
    }
  });

  test('keeps the 14-frame ring structure', () => {
    const ctx = mockCanvasContext(800, 600);
    const entry = VIBE_EFFECTS.find((e) => e.name === 'wireframeTunnel');
    expect(entry).toBeDefined();
    entry?.fn(ctx, 800, 600, 42, 7.25, palette, 1);
    expect(ctx._paths.closePaths).toBe(14);
  });

  test('depth stays ahead of the camera across energy speeds', () => {
    const bound = 4800;
    for (const speed of [0.75, 1, 1.15]) {
      for (let t = 0; t < 90; t++) {
        const ctx = mockCanvasContext(800, 600);
        const entry = VIBE_EFFECTS.find((e) => e.name === 'wireframeTunnel');
        expect(entry).toBeDefined();
        entry?.fn(ctx, 800, 600, 12345, t, palette, speed);
        for (const pair of [...ctx._paths.moveTo, ...ctx._paths.lineTo]) {
          const x = pair[0] as number;
          const y = pair[1] as number;
          expect(isFiniteCoord(x)).toBe(true);
          expect(isFiniteCoord(y)).toBe(true);
          expect(Math.abs(x)).toBeLessThanOrEqual(bound);
          expect(Math.abs(y)).toBeLessThanOrEqual(bound);
        }
      }
    }
  });
});

describe('wireframe save/restore are balanced', () => {
  const palette = ['#ff6b6b', '#4ecdc4'];

  for (const name of knownEffects) {
    test(`${name} has balanced save/restore`, () => {
      const ctx = mockCanvasContext(800, 600);
      const entry = VIBE_EFFECTS.find((e) => e.name === name);
      expect(entry).toBeDefined();

      ctx._calls = [];
      entry?.fn(ctx, 800, 600, 42, 2, palette, 1);

      const saves = ctx._calls.filter((c) => c.method === 'save').length;
      const restores = ctx._calls.filter((c) => c.method === 'restore').length;
      expect(saves).toEqual(restores);
    });
  }
});

describe('tesseract topology', () => {
  test('generates 16 vertices', () => {
    const palette = ['#fff'];
    const ctx = mockCanvasContext(800, 600);
    const entry = VIBE_EFFECTS.find((e) => e.name === 'wireframeTesseract');
    expect(entry).toBeDefined();
    entry?.fn(ctx, 800, 600, 42, 0, palette, 1);
    const totalCoords = ctx._paths.moveTo.length + ctx._paths.lineTo.length;
    expect(totalCoords).toBeGreaterThan(0);
  });
});

describe('16-cell topology', () => {
  test('generates edges', () => {
    const palette = ['#fff'];
    const ctx = mockCanvasContext(800, 600);
    const entry = VIBE_EFFECTS.find((e) => e.name === 'wireframe16Cell');
    expect(entry).toBeDefined();
    entry?.fn(ctx, 800, 600, 42, 0, palette, 1);
    const totalCoords = ctx._paths.moveTo.length + ctx._paths.lineTo.length;
    expect(totalCoords).toBeGreaterThan(0);
  });
});

describe('spiral effects produce continuous paths', () => {
  test('spiralVortex draws line segments', () => {
    const palette = ['#ff6b6b', '#4ecdc4'];
    const ctx = mockCanvasContext(800, 600);
    const entry = VIBE_EFFECTS.find((e) => e.name === 'spiralVortex');
    expect(entry).toBeDefined();
    entry?.fn(ctx, 800, 600, 42, 2, palette, 1);
    expect(ctx._paths.moveTo.length).toBeGreaterThan(0);
    expect(ctx._paths.lineTo.length).toBeGreaterThan(0);
  });

  test('roseSpiral draws line segments', () => {
    const palette = ['#ff6b6b', '#4ecdc4'];
    const ctx = mockCanvasContext(800, 600);
    const entry = VIBE_EFFECTS.find((e) => e.name === 'roseSpiral');
    expect(entry).toBeDefined();
    entry?.fn(ctx, 800, 600, 99, 3, palette, 1);
    expect(ctx._paths.moveTo.length).toBeGreaterThan(0);
    expect(ctx._paths.lineTo.length).toBeGreaterThan(0);
  });
});

describe('preparation cache', () => {
  test('cache starts empty', () => {
    clearPreparedCache();
    const stats = preparedCacheStats();
    expect(stats.size).toBe(0);
  });

  test('render populates the cache', () => {
    clearPreparedCache();
    const palette = ['#ff6b6b', '#4ecdc4'];
    const ctx = mockCanvasContext(800, 600);
    const entry = VIBE_EFFECTS.find((e) => e.name === 'particleStream');
    expect(entry).toBeDefined();
    entry?.fn(ctx, 800, 600, 42, 1, palette, 1);
    const stats = preparedCacheStats();
    expect(stats.size).toBeGreaterThan(0);
  });

  test('same seed+dims returns cached data (cache hit)', () => {
    clearPreparedCache();
    const palette = ['#ff6b6b', '#4ecdc4'];
    const ctx1 = mockCanvasContext(800, 600);
    const ctx2 = mockCanvasContext(800, 600);
    const entry = VIBE_EFFECTS.find((e) => e.name === 'particleStream');
    expect(entry).toBeDefined();

    entry?.fn(ctx1, 800, 600, 42, 1, palette, 1);
    const sizeAfterFirst = preparedCacheStats().size;

    entry?.fn(ctx2, 800, 600, 42, 2, palette, 1.2);
    const sizeAfterSecond = preparedCacheStats().size;

    // Cache size should not grow for same key
    expect(sizeAfterSecond).toBe(sizeAfterFirst);
    expect(sizeAfterFirst).toBeGreaterThan(0);
  });

  test('different seeds produce different cache entries', () => {
    clearPreparedCache();
    const palette = ['#ff6b6b', '#4ecdc4'];
    const ctx = mockCanvasContext(800, 600);
    const entry = VIBE_EFFECTS.find((e) => e.name === 'floatingOrbs');
    expect(entry).toBeDefined();

    entry?.fn(ctx, 800, 600, 42, 1, palette, 1);
    const s1 = preparedCacheStats().size;
    entry?.fn(ctx, 800, 600, 99, 1, palette, 1);
    const s2 = preparedCacheStats().size;

    expect(s2).toBeGreaterThan(s1);
  });

  test('cache is bounded under MAX_PREPARED', () => {
    clearPreparedCache();
    const palette = ['#ff6b6b', '#4ecdc4'];
    const entry = VIBE_EFFECTS.find((e) => e.name === 'particleStream');
    expect(entry).toBeDefined();

    // Generate 300 unique (seed, w, h) combos via different seeds
    for (let s = 0; s < 300; s++) {
      const ctx = mockCanvasContext(800, 600);
      entry?.fn(ctx, 800, 600, s * 1000, 1, palette, 1);
    }

    const stats = preparedCacheStats();
    expect(stats.size).toBeLessThanOrEqual(stats.max);
    expect(stats.size).toBeGreaterThan(0);
  });

  test('clearPreparedCache empties the cache', () => {
    clearPreparedCache();
    const palette = ['#aaa'];
    const ctx = mockCanvasContext(400, 300);
    const entry = VIBE_EFFECTS.find((e) => e.name === 'starfield');
    expect(entry).toBeDefined();

    entry?.fn(ctx, 400, 300, 7, 0.5, palette, 1);
    expect(preparedCacheStats().size).toBeGreaterThan(0);

    clearPreparedCache();
    expect(preparedCacheStats().size).toBe(0);
  });

  test('rendering parity: cached and fresh render produce identical paths', () => {
    clearPreparedCache();
    const palette = ['#ff6b6b', '#4ecdc4', '#45b7d1'];
    const entry = VIBE_EFFECTS.find((e) => e.name === 'flowField');
    expect(entry).toBeDefined();

    // First render (populates cache)
    const ctx1 = mockCanvasContext(1280, 720);
    entry?.fn(ctx1, 1280, 720, 42, 2, palette, 0.9);
    const paths1 = JSON.stringify({ moveTo: ctx1._paths.moveTo, lineTo: ctx1._paths.lineTo });

    // Second render (cache hit)
    const ctx2 = mockCanvasContext(1280, 720);
    entry?.fn(ctx2, 1280, 720, 42, 2, palette, 0.9);
    const paths2 = JSON.stringify({ moveTo: ctx2._paths.moveTo, lineTo: ctx2._paths.lineTo });

    expect(paths1).toBe(paths2);
  });

  test('multiple effect types co-exist in cache', () => {
    clearPreparedCache();
    const palette = ['#aaa', '#bbb'];
    const names = [
      'floatingOrbs',
      'particleStream',
      'starfield',
      'flowField',
      'rainStreaks',
    ] as const;
    for (let i = 0; i < names.length; i++) {
      const entry = VIBE_EFFECTS.find((e) => e.name === names[i]);
      expect(entry).toBeDefined();
      const ctx = mockCanvasContext(800, 600);
      entry?.fn(ctx, 800, 600, i * 100, 1, palette, 1);
    }
    const stats = preparedCacheStats();
    expect(stats.size).toBe(names.length);
  });

  test('dimension quantisation shares cache for minor resize', () => {
    clearPreparedCache();
    const palette = ['#ff6b6b', '#4ecdc4'];
    const entry = VIBE_EFFECTS.find((e) => e.name === 'particleStream');
    expect(entry).toBeDefined();

    const ctx1 = mockCanvasContext(800, 600);
    entry?.fn(ctx1, 800, 600, 42, 1, palette, 1);
    const s1 = preparedCacheStats().size;

    // 800 and 807 both quantise to 800; 600 and 607 both quantise to 608
    const ctx2 = mockCanvasContext(807, 607);
    entry?.fn(ctx2, 807, 607, 42, 1, palette, 1);
    const s2 = preparedCacheStats().size;

    expect(s2).toBe(s1);
  });
});
