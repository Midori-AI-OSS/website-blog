import { describe, expect, test } from 'bun:test';
import {
  computeEffectDelays,
  easeInOutQuad,
  effectOpacity,
  FADE_DURATION_MS,
} from './transitionMath';

describe('easeInOutQuad', () => {
  test('returns 0 at t=0', () => {
    expect(easeInOutQuad(0)).toBe(0);
  });

  test('returns 1 at t=1', () => {
    expect(easeInOutQuad(1)).toBe(1);
  });

  test('returns 0.5 at t=0.5', () => {
    expect(easeInOutQuad(0.5)).toBe(0.5);
  });

  test('interpolates smoothly', () => {
    expect(easeInOutQuad(0.25)).toBeGreaterThan(0);
    expect(easeInOutQuad(0.25)).toBeLessThan(0.5);
    expect(easeInOutQuad(0.75)).toBeGreaterThan(0.5);
    expect(easeInOutQuad(0.75)).toBeLessThan(1);
  });
});

describe('effectOpacity - outgoing', () => {
  test('at elapsed 0ms with delay 0ms returns 1', () => {
    expect(effectOpacity(0, 0, true)).toBe(1);
  });

  test('at mid-fade returns intermediate value', () => {
    const v = effectOpacity(250, 0, true);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });

  test('at end of fade returns 0', () => {
    expect(effectOpacity(FADE_DURATION_MS, 0, true)).toBe(0);
    expect(effectOpacity(FADE_DURATION_MS + 1, 0, true)).toBe(0);
  });

  test('with 100ms delay stays at 1 until delay elapses', () => {
    expect(effectOpacity(50, 100, true)).toBe(1);
    expect(effectOpacity(100, 100, true)).toBe(1);
  });

  test('with 100ms delay transitions after delay', () => {
    const beforeEnd = effectOpacity(101, 100, true);
    expect(beforeEnd).toBeGreaterThan(0);
    expect(beforeEnd).toBeLessThan(1);
  });

  test('with 100ms delay reaches 0 at delay + fade duration', () => {
    expect(effectOpacity(100 + FADE_DURATION_MS, 100, true)).toBe(0);
  });
});

describe('effectOpacity - incoming', () => {
  test('at elapsed 0ms with delay 0ms returns 0', () => {
    expect(effectOpacity(0, 0, false)).toBe(0);
  });

  test('at mid-fade returns intermediate value', () => {
    const v = effectOpacity(250, 0, false);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });

  test('at end of fade returns 1', () => {
    expect(effectOpacity(FADE_DURATION_MS, 0, false)).toBe(1);
    expect(effectOpacity(FADE_DURATION_MS + 1, 0, false)).toBe(1);
  });

  test('with 300ms delay stays at 0 until delay elapses', () => {
    expect(effectOpacity(200, 300, false)).toBe(0);
  });

  test('with 300ms delay begins after delay', () => {
    expect(effectOpacity(301, 300, false)).toBeGreaterThan(0);
  });

  test('with 300ms delay reaches 1 at delay + fade duration', () => {
    expect(effectOpacity(300 + FADE_DURATION_MS, 300, false)).toBe(1);
  });
});

describe('computeEffectDelays', () => {
  test('single foreground outgoing effect has 0 delay', () => {
    const result = computeEffectDelays([{ isBackground: false }], true);
    expect(result.delays).toEqual([0]);
    expect(result.maxEnd).toBe(FADE_DURATION_MS);
  });

  test('single background outgoing effect has base delay', () => {
    const result = computeEffectDelays([{ isBackground: true }], true);
    expect(result.delays[0]).toBe(150);
    expect(result.maxEnd).toBe(150 + FADE_DURATION_MS);
  });

  test('two foreground outgoing effects are staggered', () => {
    const result = computeEffectDelays([{ isBackground: false }, { isBackground: false }], true);
    expect(result.delays[0]).toBe(0);
    expect(result.delays[1]).toBe(80);
    expect(result.maxEnd).toBe(80 + FADE_DURATION_MS);
  });

  test('mixed bg/fg incoming effects have correct ordering', () => {
    const result = computeEffectDelays([{ isBackground: true }, { isBackground: false }], false);
    expect(result.delays[0]).toBe(250);
    expect(result.delays[1]).toBe(450);
  });

  test('maxEnd is the latest effect completion', () => {
    const result = computeEffectDelays(
      [{ isBackground: false }, { isBackground: false }, { isBackground: true }],
      true,
    );
    expect(result.maxEnd).toBeGreaterThan(FADE_DURATION_MS);
  });

  test('transition does not end before the last effect finishes', () => {
    const effects: Array<{ isBackground: boolean }> = [
      { isBackground: false },
      { isBackground: false },
      { isBackground: true },
    ];
    const outgoing = computeEffectDelays(effects, true);
    const incoming = computeEffectDelays(effects, false);

    for (let i = 0; i < effects.length; i++) {
      const outDelay = outgoing.delays[i];
      const inDelay = incoming.delays[i];
      if (outDelay !== undefined) {
        expect(outDelay + FADE_DURATION_MS).toBeLessThanOrEqual(outgoing.maxEnd);
      }
      if (inDelay !== undefined) {
        expect(inDelay + FADE_DURATION_MS).toBeLessThanOrEqual(incoming.maxEnd);
      }
    }
  });
});
