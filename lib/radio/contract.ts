export const MIDORIAI_RADIO_BASE_URL = 'https://radio.midori-ai.xyz';
export const MIDORIAI_RADIO_API_VERSION = 'radio.v1' as const;

export interface RadioError {
  code: string;
  message: string;
}

export interface RadioEnvelope<TData> {
  version: string;
  ok: boolean;
  now: string;
  data: TData | null;
  error: RadioError | null;
}

export type QualityName = 'low' | 'medium' | 'high';

export interface QualityLevel {
  name: QualityName;
  bitrate_kbps: number;
}

export interface HealthPayload {
  status: 'ready' | 'warming';
  warmup_active: boolean;
  track_count: number;
  cached_tracks: number;
  cached_bytes: number;
}

export interface TrackSummary {
  track_id: string;
  title: string;
  format: 'mp3' | 'ogg' | 'wav' | 'flac' | 'm4a';
  duration_ms: number;
}

export interface TracksPayload {
  tracks: TrackSummary[];
}

export interface ChannelEntry {
  name: string;
  track_count: number;
}

export interface ChannelsPayload {
  channels: ChannelEntry[];
}

export interface CurrentPayload {
  station_label: string;
  channel: string;
  track_id: string;
  title: string;
  duration_ms: number;
  position_ms: number;
  started_at: string;
  warmup_active: boolean;
  quality_levels: QualityLevel[];
}

export interface ArtPayload {
  channel: string;
  track_id: string;
  has_art: boolean;
  mime: string | null;
  art_url: string;
}

const QUALITY_NAME_SET = new Set<QualityName>(['low', 'medium', 'high']);

export const QUALITY_LEVELS = [
  { name: 'low', bitrate_kbps: 96 },
  { name: 'medium', bitrate_kbps: 160 },
  { name: 'high', bitrate_kbps: 320 },
] as const satisfies readonly QualityLevel[];

export function normalizeChannel(input: string | null | undefined): string {
  const normalized = input?.trim().toLowerCase() ?? '';
  return normalized.length > 0 ? normalized : 'all';
}

export function isQualityName(input: string): input is QualityName {
  return QUALITY_NAME_SET.has(input as QualityName);
}

export function normalizeQuality(input: string | null | undefined): QualityName {
  const normalized = input?.trim().toLowerCase() ?? '';
  if (isQualityName(normalized)) {
    return normalized;
  }
  return 'medium';
}

export function isRadioEnvelope<TData = unknown>(value: unknown): value is RadioEnvelope<TData> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.version === 'string' &&
    typeof candidate.ok === 'boolean' &&
    typeof candidate.now === 'string' &&
    'data' in candidate &&
    'error' in candidate
  );
}

export function toAbsoluteRadioUrl(rawUrl: string, baseUrl: string = MIDORIAI_RADIO_BASE_URL): string {
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  if (rawUrl.startsWith('/')) {
    return `${baseUrl}${rawUrl}`;
  }

  return `${baseUrl}/${rawUrl}`;
}
