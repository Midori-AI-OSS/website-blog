import {
  isRadioEnvelope,
  MIDORIAI_RADIO_API_VERSION,
} from '../lib/radio/contract';

export const RADIO_HEALTH_TIMEOUT_MS = 3_000;
export const DEFAULT_RADIO_HEALTH_URL = 'https://radio.midori-ai.xyz/health';

export interface BuildRadioStatus {
  available: boolean;
  build_id: string;
  checked_at: string;
  reason: string | null;
  health_url: string;
}

export interface RadioHealthCheckResult {
  available: boolean;
  reason: string | null;
}

function isSuccessfulHealthEnvelope(value: unknown): boolean {
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

export async function checkRadioHealth(
  healthUrl: string,
  timeoutMs: number = RADIO_HEALTH_TIMEOUT_MS,
  fetchImpl: typeof fetch = fetch,
): Promise<RadioHealthCheckResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(healthUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      return { available: false, reason: `radio-health-http-${response.status}` };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { available: false, reason: 'radio-health-invalid-json' };
    }

    if (!isSuccessfulHealthEnvelope(payload)) {
      return { available: false, reason: 'radio-health-invalid-envelope' };
    }

    return { available: true, reason: null };
  } catch (error) {
    if (controller.signal.aborted) {
      return { available: false, reason: 'radio-health-timeout' };
    }

    const message = error instanceof Error ? error.message : 'radio-health-network-error';
    return { available: false, reason: `radio-health-network-error:${message}` };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function createBuildRadioStatus(
  buildId: string,
  healthUrl: string,
  result: RadioHealthCheckResult,
  checkedAt: string = new Date().toISOString(),
): BuildRadioStatus {
  return {
    available: result.available,
    build_id: buildId,
    checked_at: checkedAt,
    reason: result.reason,
    health_url: healthUrl,
  };
}

async function runBuild(): Promise<number> {
  const buildId = crypto.randomUUID();
  const healthUrl = process.env.RADIO_HEALTH_URL?.trim() || DEFAULT_RADIO_HEALTH_URL;
  const result = await checkRadioHealth(healthUrl);
  const status = createBuildRadioStatus(buildId, healthUrl, result);

  await Bun.write('.radio-build-status.json', `${JSON.stringify(status, null, 2)}\n`);

  const nextBuild = Bun.spawn(['bunx', 'next', 'build'], {
    env: {
      ...process.env,
      NEXT_PUBLIC_RADIO_AVAILABLE_AT_BUILD: String(result.available),
      NEXT_PUBLIC_RADIO_BUILD_ID: buildId,
    },
    stderr: 'inherit',
    stdout: 'inherit',
  });

  return await nextBuild.exited;
}

if (import.meta.main) {
  const exitCode = await runBuild();
  process.exit(exitCode);
}
