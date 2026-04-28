import type { ExtractedPalette } from './artPalette';
import { DEFAULT_ART_PALETTE, hexToRgb, rgbToHex } from './artPalette';

export type BackdropMode = 'radio' | 'post' | 'placeholder';

export interface BackdropSourceState {
  radioPlaying: boolean;
  radioArtUrl: string | null;
  postCoverUrl: string | null;
  placeholderUrl: string;
}

export interface ResolvedBackdropSource {
  mode: BackdropMode;
  url: string;
}

function normalizeUrl(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveBackdropSource(state: BackdropSourceState): ResolvedBackdropSource {
  const placeholder = normalizeUrl(state.placeholderUrl) ?? '/blog/placeholder.png';
  const normalizedPostCover = normalizeUrl(state.postCoverUrl);

  if (state.radioPlaying) {
    return {
      mode: 'radio',
      url: normalizeUrl(state.radioArtUrl) ?? placeholder,
    };
  }

  return {
    mode: normalizedPostCover ? 'post' : 'placeholder',
    url: normalizedPostCover ?? placeholder,
  };
}

function darkenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const keep = 1 - Math.max(0, Math.min(1, amount));

  return rgbToHex(r * keep, g * keep, b * keep);
}

export function toDarkMediumBackdropPalette(
  palette: ExtractedPalette = DEFAULT_ART_PALETTE
): ExtractedPalette {
  return {
    primary: darkenHex(palette.primary, 0.68),
    secondary: darkenHex(palette.secondary, 0.72),
    tertiary: darkenHex(palette.tertiary, 0.64),
  };
}
