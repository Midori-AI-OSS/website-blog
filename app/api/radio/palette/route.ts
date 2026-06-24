import { type NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { ensureMinLuminance, rgbToHex } from '@/lib/theme/artPalette';

export const runtime = 'nodejs';

function quantizeChannel(value: number): number {
  return Math.round(value / 32) * 32;
}

function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: 502 },
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    const { data } = await sharp(buffer)
      .resize(64, 64, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = data;
    const colorMap = new Map<string, { count: number; r: number; g: number; b: number }>();

    for (let i = 0; i < pixels.length; i += 4) {
      const r = quantizeChannel(pixels[i] ?? 0);
      const g = quantizeChannel(pixels[i + 1] ?? 0);
      const b = quantizeChannel(pixels[i + 2] ?? 0);
      const alpha = pixels[i + 3] ?? 0;

      if (alpha < 128) continue;
      if (r > 230 && g > 230 && b > 230) continue;
      if (r < 50 && g < 50 && b < 50) continue;

      const key = `${r},${g},${b}`;
      const prev = colorMap.get(key);
      if (prev) {
        prev.count += 1;
      } else {
        colorMap.set(key, { count: 1, r, g, b });
      }
    }

    const sorted = Array.from(colorMap.values()).sort((a, b) => b.count - a.count);

    if (sorted.length === 0) {
      return NextResponse.json({
        primary: '#8b5cf6',
        secondary: '#a78bfa',
        tertiary: '#7c3aed',
      });
    }

    const picked: typeof sorted = [...sorted.slice(0, 3)];
    const minDistance = 3000;

    for (let i = 1; i < sorted.length && picked.length < 3; i += 1) {
      const candidate = sorted[i];
      if (!candidate) continue;
      const tooClose = picked.some(
        (entry) =>
          colorDistance([entry.r, entry.g, entry.b], [candidate.r, candidate.g, candidate.b]) <
          minDistance,
      );
      if (!tooClose) picked.push(candidate);
    }

    while (picked.length < 3) {
      const last = picked.at(-1);
      if (last && last.count > 0) picked.push(last);
    }

    const toHex = (r: number, g: number, b: number) => rgbToHex(r, g, b);

    if (!picked[0] || !picked[1] || !picked[2]) {
      return NextResponse.json({
        primary: '#8b5cf6',
        secondary: '#a78bfa',
        tertiary: '#7c3aed',
      });
    }

    return NextResponse.json({
      primary: ensureMinLuminance(toHex(picked[0].r, picked[0].g, picked[0].b)),
      secondary: ensureMinLuminance(toHex(picked[1].r, picked[1].g, picked[1].b)),
      tertiary: ensureMinLuminance(toHex(picked[2].r, picked[2].g, picked[2].b)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
