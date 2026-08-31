'use client';

import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import {
  hasRadioOfflineLatch,
  isSuccessfulRadioHealthEnvelope,
  RADIO_AVAILABLE_AT_BUILD,
  RADIO_BUILD_ID,
  type RadioAvailabilityStatus,
  setRadioOfflineLatch,
} from '@/lib/radio/availability';

const SERVER_HEALTH_TIMEOUT_MS = 5_500;
const CLIENT_HEALTH_TIMEOUT_MS = 5_500;

function getLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

interface RadioAvailabilityContextValue {
  buildId: string;
  status: RadioAvailabilityStatus;
  disableRadio: (reason?: string) => void;
  reason: string | null;
}

const RadioAvailabilityContext = React.createContext<RadioAvailabilityContextValue>({
  buildId: RADIO_BUILD_ID,
  status: 'offline',
  disableRadio: () => undefined,
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
  const statusRef = React.useRef(status);

  const disableRadio = React.useCallback((nextReason = 'radio-runtime-failure') => {
    if (statusRef.current === 'offline') {
      return;
    }

    statusRef.current = 'offline';
    setRadioOfflineLatch(getLocalStorage(), RADIO_BUILD_ID);
    setReason(nextReason);
    setStatus('offline');
  }, []);

  React.useEffect(() => {
    if (!RADIO_AVAILABLE_AT_BUILD) {
      return;
    }

    if (hasRadioOfflineLatch(getLocalStorage(), RADIO_BUILD_ID)) {
      statusRef.current = 'offline';
      setReason('radio-offline-latch');
      setStatus('offline');
      return;
    }

    let active = true;
    void getRadioHealthCheck(RADIO_BUILD_ID)
      .then(() => {
        if (!active || statusRef.current === 'offline') {
          return;
        }
        statusRef.current = 'online';
        setStatus('online');
      })
      .catch(() => {
        if (!active || statusRef.current === 'offline') {
          return;
        }
        disableRadio('radio-startup-health-failed');
      });

    return () => {
      active = false;
    };
  }, [disableRadio]);

  const contextValue = React.useMemo(
    () => ({ buildId: RADIO_BUILD_ID, status, disableRadio, reason }),
    [disableRadio, reason, status],
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
