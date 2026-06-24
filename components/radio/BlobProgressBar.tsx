'use client';

import Box from '@mui/joy/Box';
import * as React from 'react';
import type { ExtractedPalette } from '@/lib/theme/artPalette';
import { hexToRgb, rgbToHex } from '@/lib/theme/artPalette';

const VIEWBOX_W = 100;
const VIEWBOX_H = 20;
const TRACK_TOP = 6;
const TRACK_H = 8;
const TRACK_BOTTOM = TRACK_TOP + TRACK_H;

const TOP_WAVES = [
  { amp: 2.5, freq: 0.8, speed: 0.3, phase: 0.5 },
  { amp: 1.5, freq: 1.6, speed: 0.45, phase: 2.1 },
  { amp: 2.0, freq: 2.4, speed: 0.35, phase: 4.3 },
];

const BOTTOM_WAVES = [
  { amp: 2.0, freq: 0.9, speed: 0.35, phase: 1.7 },
  { amp: 1.8, freq: 1.7, speed: 0.4, phase: 3.5 },
  { amp: 2.2, freq: 2.1, speed: 0.38, phase: 5.1 },
];

const RIGHT_WAVES = [
  { amp: 0.8, freq: 1.3, speed: 0.3, phase: 0 },
  { amp: 0.5, freq: 2.7, speed: 0.5, phase: 1.2 },
  { amp: 0.7, freq: 0.6, speed: 0.4, phase: 2.5 },
];

function darkenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const keep = 1 - Math.max(0, Math.min(1, amount));
  return rgbToHex(r * keep, g * keep, b * keep);
}

function computeWobble(
  y: number,
  time: number,
  waves: { amp: number; freq: number; speed: number; phase: number }[],
  viewboxDim: number,
): number {
  let wobble = 0;
  for (const w of waves) {
    wobble += w.amp * Math.sin(2 * Math.PI * w.freq * (y / viewboxDim) + w.phase + w.speed * time);
  }
  return wobble;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildBlobPath(progressX: number, time: number): string {
  const edgeSamples = 20;

  const rightWobbleTop = computeWobble(TRACK_TOP, time, RIGHT_WAVES, VIEWBOX_H);
  const rightWobbleBottom = computeWobble(TRACK_BOTTOM, time, RIGHT_WAVES, VIEWBOX_H);

  const cornerTopX = progressX + rightWobbleTop;
  const cornerBottomX = progressX + rightWobbleBottom;

  const topWobbleAtCorner = computeWobble(progressX, time, TOP_WAVES, VIEWBOX_W);
  const cornerTopY = clamp(TRACK_TOP - Math.abs(topWobbleAtCorner), 0, TRACK_TOP);

  const bottomWobbleAtCorner = computeWobble(progressX, time, BOTTOM_WAVES, VIEWBOX_W);
  const cornerBottomY = clamp(
    TRACK_BOTTOM + Math.abs(bottomWobbleAtCorner),
    TRACK_BOTTOM,
    VIEWBOX_H,
  );

  let d = `M 0,${TRACK_TOP} `;

  for (let i = 1; i < edgeSamples; i += 1) {
    const t = i / edgeSamples;
    const x = t * cornerTopX;
    const wob = computeWobble(x, time, TOP_WAVES, VIEWBOX_W);
    const y = clamp(TRACK_TOP - Math.abs(wob), 0, TRACK_TOP);
    d += `L ${x},${y.toFixed(2)} `;
  }
  d += `L ${cornerTopX},${cornerTopY.toFixed(2)} `;

  for (let i = 1; i < edgeSamples; i += 1) {
    const t = i / edgeSamples;
    const y = TRACK_TOP + t * TRACK_H;
    const wob = computeWobble(y, time, RIGHT_WAVES, VIEWBOX_H);
    const x = progressX + wob;
    d += `L ${x},${y.toFixed(2)} `;
  }
  d += `L ${cornerBottomX},${cornerBottomY.toFixed(2)} `;

  for (let i = edgeSamples - 1; i >= 1; i -= 1) {
    const t = i / edgeSamples;
    const x = t * cornerBottomX;
    const wob = computeWobble(x, time, BOTTOM_WAVES, VIEWBOX_W);
    const y = clamp(TRACK_BOTTOM + Math.abs(wob), TRACK_BOTTOM, VIEWBOX_H);
    d += `L ${x},${y.toFixed(2)} `;
  }

  d += ' Z';
  return d;
}

function buildStraightPath(progressX: number): string {
  return `M 0,${TRACK_TOP} L ${progressX},${TRACK_TOP} L ${progressX},${TRACK_BOTTOM} L 0,${TRACK_BOTTOM} Z`;
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
  height = 20,
}: BlobProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const progressX = (clamped / 100) * VIEWBOX_W;

  const pathRef = React.useRef<SVGPathElement>(null);
  const shimmerRef = React.useRef<SVGLinearGradientElement>(null);
  const timeRef = React.useRef(0);
  const lastTimestampRef = React.useRef(0);
  const frameRef = React.useRef(0);

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
    const shimmer = shimmerRef.current;
    if (shimmer) {
      shimmer.setAttribute('x1', '0');
      shimmer.setAttribute('x2', '12');
    }
  }, []);

  React.useEffect(() => {
    if (!isPlaying && pathRef.current) {
      pathRef.current.setAttribute('d', buildStraightPath(progressX));
    }
  }, [isPlaying, progressX]);

  React.useEffect(() => {
    if (!isPlaying) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
      lastTimestampRef.current = 0;
      return;
    }

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
        shimmer.setAttribute('x1', String(center - 6));
        shimmer.setAttribute('x2', String(center + 6));
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

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      preserveAspectRatio="none"
      sx={{
        width: '100%',
        height,
        display: 'block',
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
        <linearGradient id="shimmerGrad" gradientUnits="userSpaceOnUse" ref={shimmerRef}>
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="40%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <clipPath id="fillClip">
          <path ref={pathRef} />
        </clipPath>
      </defs>

      <rect
        x="0"
        y={TRACK_TOP}
        width={VIEWBOX_W}
        height={TRACK_H}
        rx={TRACK_H / 2}
        fill="url(#trackDepth)"
      />

      <g clipPath="url(#fillClip)">
        <rect x="0" y="0" width={VIEWBOX_W} height={VIEWBOX_H} fill="url(#fillGrad)" />
        <rect x="0" y={TRACK_TOP} width={VIEWBOX_W} height={TRACK_H} fill="url(#shimmerGrad)" />
      </g>
    </Box>
  );
}
