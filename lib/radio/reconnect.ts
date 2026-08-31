export const RADIO_RECONNECT_DELAYS_MS = [100, 200, 400, 800, 1_600, 2_000] as const;

export function getRadioReconnectDelay(attempt: number): number {
  const normalizedAttempt = Number.isFinite(attempt) ? Math.max(0, Math.floor(attempt)) : 0;
  const index = Math.min(normalizedAttempt, RADIO_RECONNECT_DELAYS_MS.length - 1);
  return RADIO_RECONNECT_DELAYS_MS[index] ?? 2_000;
}
