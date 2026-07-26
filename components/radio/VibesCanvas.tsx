'use client';

import Box from '@mui/joy/Box';
import * as React from 'react';
import { VIBE_EFFECTS } from '@/lib/radio/vibeEffects';
import { createRng, cyrb53, deriveColors, hashToSeeds, selectFromPool } from '@/lib/radio/vibeHash';
import type { ExtractedPalette } from '@/lib/theme/artPalette';

interface VibesCanvasProps {
  seed: string;
  palette: ExtractedPalette | null;
  energyMultiplier: number;
  reducedMotion: boolean;
}

interface VibeState {
  effects: readonly { name: string }[] | null;
  effectFns: Array<
    (
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      seed: number,
      t: number,
      colors: string[],
      speed: number,
    ) => void
  >;
  colors: string[];
  effectSeeds: number[];
}

function buildVibeState(seed: string): VibeState | null {
  if (!seed) return null;
  const hash = cyrb53(seed);
  const seeds = hashToSeeds(hash, 10);
  const firstSeed = seeds[0];
  const lastSeed = seeds[seeds.length - 1];
  if (firstSeed === undefined || lastSeed === undefined) return null;
  const masterRng = createRng(firstSeed);
  const effectSeeds = seeds.slice(0, 3);
  const effectPool = [...VIBE_EFFECTS];
  const selected = selectFromPool(effectPool, masterRng, 2 + Math.floor(masterRng() * 2));
  const paletteRng = createRng(lastSeed);
  const colors = deriveColors(paletteRng, null, 5 + Math.floor(masterRng() * 3));
  return {
    effects: selected.map((e) => ({ name: e.name })),
    effectFns: selected.map((e) => e.fn),
    colors,
    effectSeeds,
  };
}

export default function VibesCanvas({
  seed,
  palette,
  energyMultiplier,
  reducedMotion,
}: VibesCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const vibeRef = React.useRef<VibeState | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const startTimeRef = React.useRef<number>(0);
  const lastFrameRef = React.useRef<number>(0);
  const paletteRef = React.useRef<ExtractedPalette | null>(palette);
  paletteRef.current = palette;

  const energyRef = React.useRef<number>(energyMultiplier);
  energyRef.current = energyMultiplier;

  const reducedMotionRef = React.useRef<boolean>(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  React.useEffect(() => {
    vibeRef.current = buildVibeState(seed);
  }, [seed]);

  React.useEffect(() => {
    if (!vibeRef.current) return;
    vibeRef.current.colors = deriveColors(
      createRng(cyrb53(`${seed}palette`)),
      paletteRef.current,
      5 + Math.floor(createRng(cyrb53(seed))() * 3),
    );
  }, [seed]);

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

      const vibe = vibeRef.current;
      if (!vibe || vibe.effectFns.length === 0) {
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

      for (let i = 0; i < vibe.effectFns.length; i++) {
        const effectFn = vibe.effectFns[i];
        const seed = vibe.effectSeeds[i] ?? 0;
        if (effectFn) {
          effectFn(ctx, w, h, seed, t, vibe.colors, speed);
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
