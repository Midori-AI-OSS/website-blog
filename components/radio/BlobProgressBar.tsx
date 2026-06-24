'use client';

import Box from '@mui/joy/Box';
import * as React from 'react';
import type { ExtractedPalette } from '@/lib/theme/artPalette';
import { hexToRgb, rgbToHex } from '@/lib/theme/artPalette';

const VIEWBOX_W = 100;
const VIEWBOX_H = 8;

const WAVES = [
  { amp: 0.8, freq: 1.3, speed: 0.3, phase: 0 },
  { amp: 0.5, freq: 2.7, speed: 0.5, phase: 1.2 },
  { amp: 0.7, freq: 0.6, speed: 0.4, phase: 2.5 },
];

function darkenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const keep = 1 - Math.max(0, Math.min(1, amount));
  return rgbToHex(r * keep, g * keep, b * keep);
}

function computeWobble(y: number, time: number): number {
  let wobble = 0;
  for (const w of WAVES) {
    wobble += w.amp * Math.sin(2 * Math.PI * w.freq * (y / VIEWBOX_H) + w.phase + w.speed * time);
  }
  return wobble;
}

function buildBlobPath(progressX: number, time: number): string {
  const samples = 11;
  let d = `M 0,0`;
  d += ` L ${progressX + computeWobble(0, time)},0`;
  for (let i = 0; i < samples; i += 1) {
    const y = (i / (samples - 1)) * VIEWBOX_H;
    d += ` L ${progressX + computeWobble(y, time)},${y.toFixed(2)}`;
  }
  d += ` L 0,${VIEWBOX_H}`;
  d += ' Z';
  return d;
}

function buildStraightPath(progressX: number): string {
  return `M 0,0 L ${progressX},0 L ${progressX},${VIEWBOX_H} L 0,${VIEWBOX_H} Z`;
}

interface BlobProgressBarProps {
  value: number;
  isPlaying: boolean;
  palette: ExtractedPalette | null;
  height?: number;
}

export default function BlobProgressBar({
  value,
  isPlaying,
  palette,
  height = 8,
}: BlobProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const progressX = (clamped / 100) * VIEWBOX_W;

  const pathRef = React.useRef<SVGPathElement>(null);
  const shimmerRef = React.useRef<SVGLinearGradientElement>(null);
  const timeRef = React.useRef(0);
  const lastTimestampRef = React.useRef(0);
  const frameRef = React.useRef(0);

  const hasPlayedRef = React.useRef(false);

  const fillColors = React.useMemo(() => {
    if (!palette) {
      return {
        left: 'var(--joy-palette-primary-400)',
        mid: 'var(--joy-palette-primary-400)',
        right: 'var(--joy-palette-primary-400)',
      };
    }
    return {
      left: darkenHex(palette.tertiary, 0.45),
      mid: darkenHex(palette.secondary, 0.45),
      right: darkenHex(palette.primary, 0.45),
    };
  }, [palette]);

  React.useEffect(() => {
    if (!isPlaying) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
      lastTimestampRef.current = 0;
      return;
    }

    hasPlayedRef.current = true;
    lastTimestampRef.current = 0;

    const animate = (timestamp: number) => {
      if (lastTimestampRef.current === 0) {
        lastTimestampRef.current = timestamp;
      }
      const dt = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      timeRef.current += dt;

      const svgPath = pathRef.current;
      if (svgPath) {
        svgPath.setAttribute('d', buildBlobPath(progressX, timeRef.current));
      }

      const shimmer = shimmerRef.current;
      if (shimmer) {
        const t = Date.now() / 1000;
        const oscillation = Math.sin(t * 0.6);
        const center = 50 + oscillation * 55;
        shimmer.setAttribute('x1', String(center - 4));
        shimmer.setAttribute('x2', String(center + 4));
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
    };
  }, [isPlaying, progressX]);

  const initialPath = React.useMemo(
    () =>
      hasPlayedRef.current
        ? buildBlobPath(progressX, timeRef.current)
        : buildStraightPath(progressX),
    [progressX],
  );

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      preserveAspectRatio="none"
      sx={{
        width: '100%',
        height,
        display: 'block',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      <defs>
        <linearGradient id="trackDepth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="40%" stopColor="rgba(255,255,255,0.10)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
        </linearGradient>
        <linearGradient id="fillGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={fillColors.left} />
          <stop offset="50%" stopColor={fillColors.mid} />
          <stop offset="100%" stopColor={fillColors.right} />
        </linearGradient>
        <linearGradient
          id="shimmerGrad"
          gradientUnits="userSpaceOnUse"
          x1="0"
          x2="8"
          ref={shimmerRef}
        >
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <clipPath id="fillClip">
          <path ref={pathRef} d={initialPath} />
        </clipPath>
      </defs>

      <rect x="0" y="0" width={VIEWBOX_W} height={VIEWBOX_H} rx="4" fill="url(#trackDepth)" />

      <g clipPath="url(#fillClip)">
        <rect x="0" y="0" width={VIEWBOX_W} height={VIEWBOX_H} fill="url(#fillGrad)" />
        <rect x="0" y="0" width={VIEWBOX_W} height={VIEWBOX_H} fill="url(#shimmerGrad)" />
      </g>
    </Box>
  );
}
