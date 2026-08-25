import { isRadioEnvelope, MIDORIAI_RADIO_API_VERSION } from './contract';

export type RadioAvailabilityStatus = 'checking' | 'online' | 'offline';

export const RADIO_AVAILABLE_AT_BUILD = process.env.NEXT_PUBLIC_RADIO_AVAILABLE_AT_BUILD === 'true';
export const RADIO_BUILD_ID = process.env.NEXT_PUBLIC_RADIO_BUILD_ID?.trim() || 'disabled';
export const RADIO_OFFLINE_STORAGE_PREFIX = 'midoriai.radio.offline:';

export interface RadioAvailabilityEnvelope {
  version: string;
  ok: boolean;
  now: string;
  data: unknown;
  error: unknown;
}

export function radioOfflineStorageKey(buildId: string = RADIO_BUILD_ID): string {
  return `${RADIO_OFFLINE_STORAGE_PREFIX}${buildId}`;
}

export function isSuccessfulRadioHealthEnvelope(
  value: unknown,
): value is RadioAvailabilityEnvelope {
  if (!isRadioEnvelope(value)) {
    return false;
  }

  return (
    value.version === MIDORIAI_RADIO_API_VERSION &&
    value.ok === true &&
    value.data !== null &&
    value.error === null
  );
}

export function hasRadioOfflineLatch(
  storage: Pick<Storage, 'getItem'> | null | undefined,
  buildId: string = RADIO_BUILD_ID,
): boolean {
  if (!storage) {
    return false;
  }

  try {
    return storage.getItem(radioOfflineStorageKey(buildId)) === 'true';
  } catch {
    return false;
  }
}

export function setRadioOfflineLatch(
  storage: Pick<Storage, 'setItem'> | null | undefined,
  buildId: string = RADIO_BUILD_ID,
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(radioOfflineStorageKey(buildId), 'true');
  } catch {
    // A blocked or full localStorage must not keep the radio UI mounted.
  }
}
