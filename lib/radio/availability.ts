import { isRadioEnvelope, MIDORIAI_RADIO_API_VERSION } from './contract';

export type RadioAvailabilityStatus = 'checking' | 'online' | 'offline';

export const RADIO_AVAILABLE_AT_BUILD = process.env.NEXT_PUBLIC_RADIO_AVAILABLE_AT_BUILD === 'true';
export const RADIO_BUILD_ID = process.env.NEXT_PUBLIC_RADIO_BUILD_ID?.trim() || 'disabled';

export interface RadioAvailabilityEnvelope {
  version: string;
  ok: boolean;
  now: string;
  data: unknown;
  error: unknown;
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
