export interface ExtractedPalette {
  primary: string;
  secondary: string;
  tertiary: string;
}

export function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((channel) =>
        Math.max(0, Math.min(255, Math.round(channel)))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    if (max === rn) h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / delta + 2) / 6;
    else h = ((rn - gn) / delta + 4) / 6;
  }

  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const value = Math.round(l * 255);
    return [value, value, value];
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

export function ensureMinLuminance(hex: string, minL = 0.55, maxS = 0.65): string {
  const [r, g, b] = hexToRgb(hex);
  let [h, s, l] = rgbToHsl(r, g, b);

  if (l < minL) l = minL;
  if (s > maxS) s = maxS;

  const [rr, gg, bb] = hslToRgb(h, s, l);
  return rgbToHex(rr, gg, bb);
}

function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

export const DEFAULT_ART_PALETTE: ExtractedPalette = {
  primary: ensureMinLuminance('#8b5cf6'),
  secondary: ensureMinLuminance('#a78bfa'),
  tertiary: ensureMinLuminance('#7c3aed'),
};

const palettePromiseCache = new Map<string, Promise<ExtractedPalette>>();

function quantizeChannel(value: number): number {
  return Math.round(value / 32) * 32;
}

export function extractPaletteFromImage(
  imageUrl: string,
  options: { fallback?: ExtractedPalette } = {}
): Promise<ExtractedPalette> {
  const fallback = options.fallback ?? DEFAULT_ART_PALETTE;

  const trimmed = imageUrl.trim();
  if (!trimmed) {
    return Promise.resolve(fallback);
  }

  if (typeof window === 'undefined') {
    return Promise.resolve(fallback);
  }

  const existing = palettePromiseCache.get(trimmed);
  if (existing) {
    return existing;
  }

  const promise = new Promise<ExtractedPalette>((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(fallback);
          return;
        }

        const maxDimension = 64;
        const scale = Math.min(maxDimension / image.width, maxDimension / image.height, 1);
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        const colorMap = new Map<string, { count: number; r: number; g: number; b: number }>();

        for (let index = 0; index < pixels.length; index += 4) {
          const r = quantizeChannel(pixels[index] ?? 0);
          const g = quantizeChannel(pixels[index + 1] ?? 0);
          const b = quantizeChannel(pixels[index + 2] ?? 0);
          const alpha = pixels[index + 3] ?? 0;

          if (alpha < 128) continue;
          if (r > 230 && g > 230 && b > 230) continue;
          if (r < 50 && g < 50 && b < 50) continue;

          const key = `${r},${g},${b}`;
          const previous = colorMap.get(key);
          if (previous) {
            previous.count += 1;
          } else {
            colorMap.set(key, { count: 1, r, g, b });
          }
        }

        const sorted = Array.from(colorMap.values()).sort((a, b) => b.count - a.count);
        if (sorted.length === 0) {
          resolve(fallback);
          return;
        }

        const picked: typeof sorted = [sorted[0]!];
        const minDistance = 3000;

        for (let index = 1; index < sorted.length && picked.length < 3; index += 1) {
          const candidate = sorted[index]!;
          const isTooClose = picked.some(
            (entry) =>
              colorDistance([entry.r, entry.g, entry.b], [candidate.r, candidate.g, candidate.b]) <
              minDistance
          );

          if (!isTooClose) {
            picked.push(candidate);
          }
        }

        while (picked.length < 3) {
          picked.push(picked[picked.length - 1]!);
        }

        resolve({
          primary: ensureMinLuminance(rgbToHex(picked[0]!.r, picked[0]!.g, picked[0]!.b)),
          secondary: ensureMinLuminance(rgbToHex(picked[1]!.r, picked[1]!.g, picked[1]!.b)),
          tertiary: ensureMinLuminance(rgbToHex(picked[2]!.r, picked[2]!.g, picked[2]!.b)),
        });
      } catch {
        resolve(fallback);
      }
    };

    image.onerror = () => {
      resolve(fallback);
    };

    image.src = trimmed;
  });

  palettePromiseCache.set(trimmed, promise);
  return promise;
}
