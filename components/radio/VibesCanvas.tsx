'use client';

import Box from '@mui/joy/Box';
import * as React from 'react';
import { computeEffectDelays, effectOpacity, FADE_DURATION_MS } from '@/lib/radio/transitionMath';
import { VIBE_EFFECTS } from '@/lib/radio/vibeEffects';
import {
  createRng,
  cyrb53,
  deriveColors,
  hashToSeeds,
  sceneForPosition,
  selectFromPool,
  visualIdentitySeed,
} from '@/lib/radio/vibeHash';
import type { ExtractedPalette } from '@/lib/theme/artPalette';

interface VibesCanvasProps {
  seed: string;
  trackId: string;
  startedAt: string;
  durationMs: number;
  positionMs: number;
  palette: ExtractedPalette | null;
  energyMultiplier: number;
  reducedMotion: boolean;
}

interface VibeEffectEntry {
  name: string;
  fn: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    seed: number,
    t: number,
    colors: string[],
    speed: number,
  ) => void;
  seed: number;
  phaseOffset: number;
  tempoMult: number;
}

interface VibeScene {
  effects: VibeEffectEntry[];
  colors: string[];
}

interface TransitionState {
  prev: VibeScene;
  next: VibeScene;
  startedAt: number;
  fadeOutDelays: number[];
  fadeInDelays: number[];
  maxEndMs: number;
}

const BACKGROUND_NAMES = new Set(['auroraRibbons', 'geometricWaves', 'threadWeave', 'cloudLayers']);

function buildVibeScene(visualSeed: string): VibeScene | null {
  if (!visualSeed) return null;
  const hash = cyrb53(visualSeed);
  const seeds = hashToSeeds(hash, 12);
  const firstSeed = seeds[0];
  const lastSeed = seeds[seeds.length - 1];
  if (firstSeed === undefined || lastSeed === undefined) return null;
  const masterRng = createRng(firstSeed);
  const effectSeeds = seeds.slice(0, 3);
  const timingSeeds = seeds.slice(3, 6);
  const effectPool = [...VIBE_EFFECTS];
  const selected = selectFromPool(effectPool, masterRng, 2 + Math.floor(masterRng() * 2));

  const withSeeds = selected.map((e, i) => ({
    ...e,
    seed: effectSeeds[i] ?? 0,
    phaseOffset: (((timingSeeds[i] ?? 0) % 1000) / 1000) * Math.PI * 2,
    tempoMult: 0.82 + (((timingSeeds[i] ?? 0) % 1000) / 1000) * 0.36,
  }));

  const ordered: typeof withSeeds = [];
  for (const item of withSeeds) if (BACKGROUND_NAMES.has(item.name)) ordered.push(item);
  for (const item of withSeeds) if (!BACKGROUND_NAMES.has(item.name)) ordered.push(item);

  const paletteRng = createRng(lastSeed);
  const colors = deriveColors(paletteRng, null, 5 + Math.floor(masterRng() * 3));

  return {
    effects: ordered.map((e) => ({
      name: e.name,
      fn: e.fn,
      seed: e.seed,
      phaseOffset: e.phaseOffset,
      tempoMult: e.tempoMult,
    })),
    colors,
  };
}

export default function VibesCanvas({
  seed,
  trackId,
  startedAt,
  durationMs,
  positionMs,
  palette,
  energyMultiplier,
  reducedMotion,
}: VibesCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const sceneRef = React.useRef<VibeScene | null>(null);
  const transitionRef = React.useRef<TransitionState | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const startTimeRef = React.useRef<number>(0);
  const lastFrameRef = React.useRef<number>(0);
  const paletteRef = React.useRef<ExtractedPalette | null>(palette);
  paletteRef.current = palette;
  const energyRef = React.useRef<number>(energyMultiplier);
  energyRef.current = energyMultiplier;
  const reducedMotionRef = React.useRef<boolean>(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const prevVisualSeedRef = React.useRef<string>('');
  const scratchRef = React.useRef<HTMLCanvasElement | null>(null);

  const sceneIndex = React.useMemo(
    () => sceneForPosition(positionMs, durationMs),
    [positionMs, durationMs],
  );
  const visualSeed = React.useMemo(
    () => visualIdentitySeed(trackId, startedAt, seed, sceneIndex),
    [trackId, startedAt, seed, sceneIndex],
  );

  React.useEffect(() => {
    if (!visualSeed) return;
    const newScene = buildVibeScene(visualSeed);
    if (!newScene) return;

    if (sceneRef.current && prevVisualSeedRef.current && visualSeed !== prevVisualSeedRef.current) {
      if (reducedMotionRef.current) {
        transitionRef.current = {
          prev: sceneRef.current,
          next: newScene,
          startedAt: performance.now(),
          fadeOutDelays: [0],
          fadeInDelays: [0],
          maxEndMs: FADE_DURATION_MS / 2,
        };
      } else {
        const outDelays = computeEffectDelays(
          sceneRef.current.effects.map((e) => ({ isBackground: BACKGROUND_NAMES.has(e.name) })),
          true,
        );
        const inDelays = computeEffectDelays(
          newScene.effects.map((e) => ({ isBackground: BACKGROUND_NAMES.has(e.name) })),
          false,
        );
        transitionRef.current = {
          prev: sceneRef.current,
          next: newScene,
          startedAt: performance.now(),
          fadeOutDelays: outDelays.delays,
          fadeInDelays: inDelays.delays,
          maxEndMs: Math.max(outDelays.maxEnd, inDelays.maxEnd),
        };
      }
    } else if (!sceneRef.current) {
      sceneRef.current = newScene;
    }

    prevVisualSeedRef.current = visualSeed;
  }, [visualSeed]);

  React.useEffect(() => {
    const transition = transitionRef.current;
    const target = transition ? transition.next : sceneRef.current;
    if (!target) return;
    target.colors = deriveColors(
      createRng(cyrb53(`${visualSeed}palette`)),
      paletteRef.current,
      5 + Math.floor(createRng(cyrb53(visualSeed))() * 3),
    );
  }, [visualSeed]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const sc = scratchRef.current;
      if (sc) {
        sc.width = canvas.width;
        sc.height = canvas.height;
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    let running = true;

    const frame = (timestamp: number) => {
      if (!running) return;

      if (reducedMotionRef.current && startTimeRef.current !== 0) return;

      if (timestamp - lastFrameRef.current < 32) {
        if (running) rafRef.current = requestAnimationFrame(frame);
        return;
      }
      lastFrameRef.current = timestamp;

      const transition = transitionRef.current;
      const scene = sceneRef.current;
      if (!scene || scene.effects.length === 0) {
        if (running) rafRef.current = requestAnimationFrame(frame);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (startTimeRef.current === 0) {
        startTimeRef.current = timestamp;
      }

      const elapsed = (timestamp - startTimeRef.current) / 1000;
      const dpr = Math.min(window.devicePixelRatio, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.clearRect(0, 0, w, h);

      const speed = Math.min(1.15, energyRef.current || 1);
      const t = reducedMotionRef.current ? 1 : elapsed;

      if (transition) {
        let scratch = scratchRef.current;
        if (!scratch) {
          scratch = document.createElement('canvas');
          scratch.width = canvas.width;
          scratch.height = canvas.height;
          scratchRef.current = scratch;
        }

        const scratchCtx = scratch.getContext('2d');
        if (!scratchCtx) return;

        const transitionElapsed = performance.now() - transition.startedAt;

        for (let i = 0; i < transition.prev.effects.length; i++) {
          const eff = transition.prev.effects[i];
          if (!eff) continue;
          const delay = transition.fadeOutDelays[i] ?? 0;
          const opacity = effectOpacity(transitionElapsed, delay, true);
          if (opacity <= 0) continue;

          scratchCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          scratchCtx.clearRect(0, 0, w, h);
          scratchCtx.globalAlpha = 1;
          const effT = t * eff.tempoMult + eff.phaseOffset;
          eff.fn(scratchCtx, w, h, eff.seed, effT, transition.prev.colors, speed);

          ctx.save();
          ctx.globalAlpha = opacity;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.drawImage(scratch, 0, 0);
          ctx.restore();
        }

        for (let i = 0; i < transition.next.effects.length; i++) {
          const eff = transition.next.effects[i];
          if (!eff) continue;
          const delay = transition.fadeInDelays[i] ?? 0;
          const opacity = effectOpacity(transitionElapsed, delay, false);
          if (opacity <= 0) continue;

          scratchCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          scratchCtx.clearRect(0, 0, w, h);
          scratchCtx.globalAlpha = 1;
          const effT = t * eff.tempoMult + eff.phaseOffset;
          eff.fn(scratchCtx, w, h, eff.seed, effT, transition.next.colors, speed);

          ctx.save();
          ctx.globalAlpha = opacity;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.drawImage(scratch, 0, 0);
          ctx.restore();
        }

        if (transitionElapsed >= transition.maxEndMs) {
          transitionRef.current = null;
          sceneRef.current = transition.next;
          scratchRef.current = null;
        }
      } else {
        for (let i = 0; i < scene.effects.length; i++) {
          const eff = scene.effects[i];
          if (!eff) continue;
          const effT = t * eff.tempoMult + eff.phaseOffset;
          eff.fn(ctx, w, h, eff.seed, effT, scene.colors, speed);
        }
      }

      if (reducedMotionRef.current) {
        return;
      }

      if (running) {
        rafRef.current = requestAnimationFrame(frame);
      }
    };

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      running = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      startTimeRef.current = 0;
      observer.disconnect();
    };
  }, []);

  if (!seed) return null;

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}
    >
      <Box
        component="canvas"
        ref={canvasRef}
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          mixBlendMode: 'screen',
          opacity: 0.75,
        }}
      />
    </Box>
  );
}
