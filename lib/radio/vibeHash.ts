import type { ExtractedPalette } from '@/lib/theme/artPalette';

export function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export function createRng(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashToSeeds(hash: number, count: number): number[] {
  const seeds: number[] = [];
  for (let i = 0; i < count; i++) {
    seeds.push(cyrb53(String(i), hash));
  }
  return seeds;
}

export function selectFromPool<T>(pool: readonly T[], rng: () => number, count: number): T[] {
  const arr = [...pool];
  const n = Math.min(count, arr.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (arr.length - i));
    const a = arr[i];
    const b = arr[j];
    if (a === undefined || b === undefined) continue;
    arr[i] = b;
    arr[j] = a;
  }
  return arr.slice(0, n);
}

function paletteHsl(hex: string): [number, number, number] {
  const [r, g, b] = (() => {
    const normalized = hex.replace('#', '');
    return [
      Number.parseInt(normalized.slice(0, 2), 16),
      Number.parseInt(normalized.slice(2, 4), 16),
      Number.parseInt(normalized.slice(4, 6), 16),
    ];
  })();

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

  return [h * 360, s * 100, l * 100];
}

function nearestPaletteHsl(
  h: number,
  s: number,
  l: number,
  palette: ExtractedPalette,
): [number, number, number] {
  const entries = [palette.primary, palette.secondary, palette.tertiary];
  let bestIdx = 0;
  let bestDist = Infinity;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry) continue;
    const [ph, ps, pl] = paletteHsl(entry);
    const dh = Math.min(Math.abs(h - ph), 360 - Math.abs(h - ph)) / 360;
    const ds = Math.abs(s - ps) / 100;
    const dl = Math.abs(l - pl) / 100;
    const dist = dh * dh + ds * ds + dl * dl;
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }

  const bestEntry = entries[bestIdx];
  if (bestEntry) return paletteHsl(bestEntry);
  return [0, 0, 0];
}

function hslStr(h: number, s: number, l: number, a: number): string {
  return `hsla(${Math.round(h)},${Math.round(s)}%,${Math.round(l)}%,${a})`;
}

export function deriveColors(
  rng: () => number,
  palette: ExtractedPalette | null,
  count: number,
): string[] {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const h = rng() * 360;
    const s = 40 + rng() * 30;
    const l = Math.min(80, 45 + rng() * 25);

    if (palette) {
      const [ph, ps, pl] = nearestPaletteHsl(h, s, l, palette);
      const blendH = h * 0.7 + ph * 0.3;
      const blendS = s * 0.7 + ps * 0.3;
      const blendL = l * 0.7 + pl * 0.3;
      colors.push(hslStr(blendH, blendS, Math.min(80, blendL), 1));
    } else {
      colors.push(hslStr(h, s, l, 1));
    }
  }
  return colors;
}

const HIGH_ENERGY_WORDS = [
  'powerful',
  'intense',
  'fast',
  'aggressive',
  'heavy',
  'driving',
  'explosive',
  'fiery',
  'wild',
  'energetic',
  'hype',
  'epic',
  'massive',
  'hard',
  'loud',
  'banger',
  'rage',
  'fury',
  'volatile',
];

const LOW_ENERGY_WORDS = [
  'chill',
  'mellow',
  'soft',
  'gentle',
  'calm',
  'peaceful',
  'slow',
  'ambient',
  'dreamy',
  'soothing',
  'lullaby',
  'quiet',
  'ethereal',
  'floating',
  'sleepy',
  'subdued',
  'tender',
  'whisper',
  'pastoral',
];

export function detectEnergy(vibeText: string): number {
  if (!vibeText) return 0;
  const lower = vibeText.toLowerCase();
  let highCount = 0;
  let lowCount = 0;

  for (const word of HIGH_ENERGY_WORDS) {
    let idx = lower.indexOf(word);
    while (idx !== -1) {
      highCount++;
      idx = lower.indexOf(word, idx + word.length);
    }
  }

  for (const word of LOW_ENERGY_WORDS) {
    let idx = lower.indexOf(word);
    while (idx !== -1) {
      lowCount++;
      idx = lower.indexOf(word, idx + word.length);
    }
  }

  if (highCount === 0 && lowCount === 0) return 1.0;
  const ratio = highCount / Math.max(1, lowCount);
  return Math.min(1.5, Math.max(0.6, ratio));
}
