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
  { amp: 4.0, freq: 3.0, speed: 0.3, phase: 0.5 },
  { amp: 3.0, freq: 5.5, speed: 0.45, phase: 2.1 },
  { amp: 3.5, freq: 8.0, speed: 0.35, phase: 4.3 },
];

const BOTTOM_WAVES = [
  { amp: 3.5, freq: 2.5, speed: 0.35, phase: 1.7 },
  { amp: 3.0, freq: 5.0, speed: 0.4, phase: 3.5 },
  { amp: 3.5, freq: 7.5, speed: 0.38, phase: 5.1 },
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

function buildBlobPath(progressX: number, time: number, easing: number): string {
  const edgeSamples = 20;

  const topWobbleAtCorner = computeWobble(progressX, time, TOP_WAVES, VIEWBOX_W);
  const cornerTopY = clamp(TRACK_TOP - Math.abs(topWobbleAtCorner) * easing, 0, TRACK_TOP);

  const bottomWobbleAtCorner = computeWobble(progressX, time, BOTTOM_WAVES, VIEWBOX_W);
  const cornerBottomY = clamp(
    TRACK_BOTTOM + Math.abs(bottomWobbleAtCorner) * easing,
    TRACK_BOTTOM,
    VIEWBOX_H,
  );

  let d = `M 0,${TRACK_TOP} `;

  for (let i = 1; i < edgeSamples; i += 1) {
    const t = i / edgeSamples;
    const x = t * progressX;
    const wob = computeWobble(x, time, TOP_WAVES, VIEWBOX_W);
    const y = clamp(TRACK_TOP - Math.abs(wob) * easing, 0, TRACK_TOP);
    d += `L ${x},${y.toFixed(2)} `;
  }
  d += `L ${progressX},${cornerTopY.toFixed(2)} `;

  d += `L ${progressX},${cornerBottomY.toFixed(2)} `;

  for (let i = edgeSamples - 1; i >= 1; i -= 1) {
    const t = i / edgeSamples;
    const x = t * progressX;
    const wob = computeWobble(x, time, BOTTOM_WAVES, VIEWBOX_W);
    const y = clamp(TRACK_BOTTOM + Math.abs(wob) * easing, TRACK_BOTTOM, VIEWBOX_H);
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

  const fillColors = React.useMemo(() => {
    if (!palette) {
      return {
        left: 'var(--joy-palette-primary-400)',
        mid: 'var(--joy-palette-primary-400)',
        right: 'var(--joy-palette-primary-400)',
      };
    }
    return {
      left: darkenHex(palette.tertiary, 0.2),
      mid: darkenHex(palette.secondary, 0.2),
      right: darkenHex(palette.primary, 0.2),
    };
  }, [palette]);

  React.useEffect(() => {
    const shimmer = shimmerRef.current;
    if (shimmer) {
      shimmer.setAttribute('x1', '0');
      shimmer.setAttribute('x2', '12');
    }
  }, []);

  const isPlayingRef = React.useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const easingRef = React.useRef(0);

  React.useEffect(() => {
    let frame = 0;
    lastTimestampRef.current = 0;

    const animate = (timestamp: number) => {
      if (lastTimestampRef.current === 0) {
        lastTimestampRef.current = timestamp;
      }
      const dt = Math.min(0.1, (timestamp - lastTimestampRef.current) / 1000);
      lastTimestampRef.current = timestamp;

      const EASE_SPEED = 0.7;
      const target = isPlayingRef.current ? 1 : 0;
      easingRef.current = target + (easingRef.current - target) * Math.exp(-EASE_SPEED * dt);

      if (easingRef.current < 0.001 && !isPlayingRef.current) {
        easingRef.current = 0;
        const svgPath = pathRef.current;
        if (svgPath) {
          svgPath.setAttribute('d', buildStraightPath(progressX));
        }
      } else {
        timeRef.current += dt;

        const svgPath = pathRef.current;
        if (svgPath) {
          svgPath.setAttribute('d', buildBlobPath(progressX, timeRef.current, easingRef.current));
        }
      }

      const shimmer = shimmerRef.current;
      if (shimmer) {
        const t = Date.now() / 1000;
        const oscillation = Math.sin(t * 0.6);
        const center = 50 + oscillation * 55;
        shimmer.setAttribute('x1', String(center - 6));
        shimmer.setAttribute('x2', String(center + 6));
      }

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);

    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [progressX]);

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
