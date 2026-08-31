'use client';

import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import {
  isSuccessfulRadioHealthEnvelope,
  RADIO_AVAILABLE_AT_BUILD,
  RADIO_BUILD_ID,
  type RadioAvailabilityStatus,
} from '@/lib/radio/availability';

const SERVER_HEALTH_TIMEOUT_MS = 5_500;
const CLIENT_HEALTH_TIMEOUT_MS = 5_500;

interface RadioAvailabilityContextValue {
  buildId: string;
  status: RadioAvailabilityStatus;
  reason: string | null;
}

const RadioAvailabilityContext = React.createContext<RadioAvailabilityContextValue>({
  buildId: RADIO_BUILD_ID,
  status: 'offline',
  reason: 'radio-not-enabled-at-build',
});

async function requestRadioHealth(signal: AbortSignal): Promise<void> {
  const response = await fetch('/api/radio/health', {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // The envelope validation below provides the stable failure path.
  }

  if (!response.ok || !isSuccessfulRadioHealthEnvelope(payload)) {
    throw new Error('radio-health-check-failed');
  }
}

const healthChecksByBuild = new Map<string, Promise<void>>();

function getRadioHealthCheck(buildId: string): Promise<void> {
  const existing = healthChecksByBuild.get(buildId);
  if (existing !== undefined) {
    return existing;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, CLIENT_HEALTH_TIMEOUT_MS);
  const check = requestRadioHealth(controller.signal).finally(() => {
    window.clearTimeout(timeoutId);
    healthChecksByBuild.delete(buildId);
  });
  healthChecksByBuild.set(buildId, check);
  return check;
}

export function useRadioAvailability(): RadioAvailabilityContextValue {
  return React.useContext(RadioAvailabilityContext);
}

export function RadioAvailabilityProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<RadioAvailabilityStatus>(() =>
    RADIO_AVAILABLE_AT_BUILD ? 'checking' : 'offline',
  );
  const [reason, setReason] = React.useState<string | null>(() =>
    RADIO_AVAILABLE_AT_BUILD ? null : 'radio-not-enabled-at-build',
  );

  React.useEffect(() => {
    if (!RADIO_AVAILABLE_AT_BUILD) {
      return;
    }

    let active = true;
    void getRadioHealthCheck(RADIO_BUILD_ID)
      .then(() => {
        if (!active) {
          return;
        }
        setReason(null);
        setStatus('online');
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setReason('radio-startup-health-failed');
        setStatus('offline');
      });

    return () => {
      active = false;
    };
  }, []);

  const contextValue = React.useMemo(
    () => ({ buildId: RADIO_BUILD_ID, status, reason }),
    [reason, status],
  );

  return (
    <RadioAvailabilityContext.Provider value={contextValue}>
      {children}
    </RadioAvailabilityContext.Provider>
  );
}

export function RadioAvailabilityGate({
  children,
  redirectWhenOffline = false,
}: {
  children: React.ReactNode;
  redirectWhenOffline?: boolean;
}) {
  const { status } = useRadioAvailability();
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (redirectWhenOffline && status === 'offline' && pathname === '/radio') {
      router.replace('/');
    }
  }, [pathname, redirectWhenOffline, router, status]);

  if (status !== 'online') {
    return null;
  }

  return <>{children}</>;
}

export const RADIO_SERVER_HEALTH_TIMEOUT_MS = SERVER_HEALTH_TIMEOUT_MS;
export const RADIO_BROWSER_HEALTH_TIMEOUT_MS = CLIENT_HEALTH_TIMEOUT_MS;
