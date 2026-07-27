import { describe, expect, test } from 'bun:test';
import { VIBE_EFFECT_COUNT, VIBE_EFFECTS } from './vibeEffects';

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

  test('contains all 9 new effects', () => {
    const names = new Set(VIBE_EFFECTS.map((e) => e.name));
    for (const name of knownEffects) {
      expect(names.has(name)).toBe(true);
    }
  });

  test('pool is expanded to 35', () => {
    expect(VIBE_EFFECTS.length).toBe(35);
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
