import { normalizeChannel, normalizeQuality } from './contract';
import type { QualityName } from './contract';

export const MIDORIAI_RADIO_OPEN_KEY = 'midoriai.radio.open';
export const MIDORIAI_RADIO_VOLUME_KEY = 'midoriai.radio.volume';
export const MIDORIAI_RADIO_QUALITY_KEY = 'midoriai.radio.quality';
export const MIDORIAI_RADIO_CHANNEL_KEY = 'midoriai.radio.channel';
export const MIDORIAI_RADIO_LAST_ERROR_KEY = 'midoriai.radio.last_error';

export interface RadioPersistedState {
  open: boolean;
  volume: number;
  quality: QualityName;
  channel: string;
  lastError: string | null;
}

export const DEFAULT_RADIO_STATE: RadioPersistedState = {
  open: false,
  volume: 0.5,
  quality: 'medium',
  channel: 'all',
  lastError: null,
};

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readString(storage: Storage, key: string): string | null {
  const value = storage.getItem(key);
  return value === null ? null : value;
}

function readBoolean(storage: Storage, key: string, fallback: boolean): boolean {
  const value = storage.getItem(key);
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return fallback;
}

function clampVolume(input: number): number {
  if (Number.isNaN(input)) {
    return DEFAULT_RADIO_STATE.volume;
  }
  return Math.min(1, Math.max(0, input));
}

function readVolume(storage: Storage): number {
  const raw = storage.getItem(MIDORIAI_RADIO_VOLUME_KEY);
  if (raw === null) {
    return DEFAULT_RADIO_STATE.volume;
  }

  const parsed = Number(raw);
  return clampVolume(parsed);
}

function writeString(key: string, value: string): void {
  const storage = getStorage();
  if (storage === null) {
    return;
  }
  storage.setItem(key, value);
}

export function loadRadioState(): RadioPersistedState {
  const storage = getStorage();
  if (storage === null) {
    return DEFAULT_RADIO_STATE;
  }

  const qualityRaw = readString(storage, MIDORIAI_RADIO_QUALITY_KEY);
  const channelRaw = readString(storage, MIDORIAI_RADIO_CHANNEL_KEY);
  const lastError = readString(storage, MIDORIAI_RADIO_LAST_ERROR_KEY);

  return {
    open: readBoolean(storage, MIDORIAI_RADIO_OPEN_KEY, DEFAULT_RADIO_STATE.open),
    volume: readVolume(storage),
    quality: normalizeQuality(qualityRaw),
    channel: normalizeChannel(channelRaw),
    lastError,
  };
}

export function saveRadioOpen(open: boolean): void {
  writeString(MIDORIAI_RADIO_OPEN_KEY, String(open));
}

export function saveRadioVolume(volume: number): void {
  writeString(MIDORIAI_RADIO_VOLUME_KEY, clampVolume(volume).toString());
}

export function saveRadioQuality(quality: QualityName): void {
  writeString(MIDORIAI_RADIO_QUALITY_KEY, quality);
}

export function saveRadioChannel(channel: string): void {
  writeString(MIDORIAI_RADIO_CHANNEL_KEY, normalizeChannel(channel));
}

export function saveRadioLastError(message: string): void {
  writeString(MIDORIAI_RADIO_LAST_ERROR_KEY, message);
}

export function clearRadioLastError(): void {
  const storage = getStorage();
  if (storage === null) {
    return;
  }
  storage.removeItem(MIDORIAI_RADIO_LAST_ERROR_KEY);
}
