import {
  isRadioEnvelope,
  MIDORIAI_RADIO_API_VERSION,
  MIDORIAI_RADIO_BASE_URL,
  normalizeChannel,
  normalizeQuality,
  toAbsoluteRadioUrl,
} from './contract';
import type {
  ArtPayload,
  ChannelsPayload,
  CurrentPayload,
  HealthPayload,
  QualityName,
  RadioEnvelope,
  TracksPayload,
} from './contract';

const JSON_HEADERS = {
  Accept: 'application/json',
} as const;

export class RadioApiError extends Error {
  code: string;
  status: number;
  now: string | null;

  constructor(message: string, code: string, status: number, now: string | null = null) {
    super(message);
    this.name = 'RadioApiError';
    this.code = code;
    this.status = status;
    this.now = now;
  }
}

async function parseJsonSafe(response: Response): Promise<unknown | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function parseEnvelope<TData>(payload: unknown, requestPath: string): RadioEnvelope<TData> {
  if (!isRadioEnvelope<TData>(payload)) {
    throw new RadioApiError(
      `Invalid radio response envelope from ${requestPath}`,
      'RADIO_INVALID_ENVELOPE',
      502
    );
  }

  if (payload.version !== MIDORIAI_RADIO_API_VERSION) {
    throw new RadioApiError(
      `Unsupported radio API version: ${payload.version}`,
      'RADIO_UNSUPPORTED_VERSION',
      502,
      payload.now
    );
  }

  return payload;
}

async function requestRadioEnvelope<TData>(
  path: string,
  init: RequestInit = {},
  baseUrl: string = MIDORIAI_RADIO_BASE_URL
): Promise<RadioEnvelope<TData>> {
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        ...JSON_HEADERS,
        ...(init.headers ?? {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown network error';
    throw new RadioApiError(message, 'RADIO_NETWORK_ERROR', 0);
  }

  const parsedJson = await parseJsonSafe(response);
  const envelope = parsedJson !== null ? parseEnvelope<TData>(parsedJson, path) : null;

  if (!response.ok) {
    if (envelope?.error) {
      throw new RadioApiError(
        envelope.error.message,
        envelope.error.code,
        response.status,
        envelope.now
      );
    }

    throw new RadioApiError(
      `Radio request failed: ${response.status}`,
      'RADIO_HTTP_ERROR',
      response.status
    );
  }

  if (!envelope) {
    throw new RadioApiError(
      `Empty radio response from ${path}`,
      'RADIO_EMPTY_RESPONSE',
      502
    );
  }

  if (!envelope.ok) {
    const code = envelope.error?.code ?? 'RADIO_ERROR';
    const message = envelope.error?.message ?? 'Radio request failed';
    throw new RadioApiError(message, code, response.status, envelope.now);
  }

  return envelope;
}

async function requestRadioData<TData>(
  path: string,
  init: RequestInit = {},
  baseUrl: string = MIDORIAI_RADIO_BASE_URL
): Promise<TData> {
  const envelope = await requestRadioEnvelope<TData>(path, init, baseUrl);

  if (envelope.data === null) {
    throw new RadioApiError(
      `Radio response did not include data for ${path}`,
      'RADIO_NULL_DATA',
      502,
      envelope.now
    );
  }

  return envelope.data;
}

function buildChannelQueryPath(path: string, channel: string | null | undefined): string {
  const params = new URLSearchParams();
  params.set('channel', normalizeChannel(channel));
  return `${path}?${params.toString()}`;
}

export function buildArtImageUrl(
  channel: string | null | undefined,
  baseUrl: string = MIDORIAI_RADIO_BASE_URL
): string {
  return `${baseUrl}${buildChannelQueryPath('/radio/v1/art/image', channel)}`;
}

export function buildStreamUrl(options: {
  channel: string | null | undefined;
  quality: QualityName | string | null | undefined;
  baseUrl?: string;
  cacheBust?: boolean;
}): string {
  const normalizedChannel = normalizeChannel(options.channel);
  const normalizedQuality = normalizeQuality(options.quality);
  const url = new URL('/radio/v1/stream', options.baseUrl ?? MIDORIAI_RADIO_BASE_URL);
  url.searchParams.set('channel', normalizedChannel);
  url.searchParams.set('q', normalizedQuality);

  if (options.cacheBust === true) {
    url.searchParams.set('ts', Date.now().toString());
  }

  return url.toString();
}

export async function fetchHealth(baseUrl: string = MIDORIAI_RADIO_BASE_URL): Promise<HealthPayload> {
  return requestRadioData<HealthPayload>('/health', {}, baseUrl);
}

export async function fetchChannels(
  baseUrl: string = ''
): Promise<ChannelsPayload> {
  return requestRadioData<ChannelsPayload>('/api/radio/channels', {}, baseUrl);
}

export async function fetchCurrent(
  channel: string | null | undefined,
  baseUrl: string = ''
): Promise<CurrentPayload> {
  return requestRadioData<CurrentPayload>(buildChannelQueryPath('/api/radio/current', channel), {}, baseUrl);
}

export async function fetchArt(
  channel: string | null | undefined,
  baseUrl: string = ''
): Promise<ArtPayload> {
  const art = await requestRadioData<ArtPayload>(buildChannelQueryPath('/api/radio/art', channel), {}, baseUrl);
  return {
    ...art,
    art_url: toAbsoluteRadioUrl(art.art_url, MIDORIAI_RADIO_BASE_URL),
  };
}

export async function fetchTracks(
  channel: string | null | undefined,
  baseUrl: string = MIDORIAI_RADIO_BASE_URL
): Promise<TracksPayload> {
  return requestRadioData<TracksPayload>(buildChannelQueryPath('/radio/v1/tracks', channel), {}, baseUrl);
}
