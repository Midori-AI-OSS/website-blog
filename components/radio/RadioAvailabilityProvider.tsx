'use client';

import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import {
  isSuccessfulRadioHealthEnvelope,
  type RadioAvailabilityStatus,
} from '@/lib/radio/availability';

const CLIENT_HEALTH_TIMEOUT_MS = 5_500;
const RADIO_AVAILABILITY_REFRESH_MS = 30 * 60 * 1_000;

interface RadioAvailabilityContextValue {
  status: RadioAvailabilityStatus;
  reason: string | null;
}

const RadioAvailabilityContext = React.createContext<RadioAvailabilityContextValue>({
  status: 'checking',
  reason: null,
});

async function requestRadioHealth(): Promise<void> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, CLIENT_HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch('/api/radio/health', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
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
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function useRadioAvailability(): RadioAvailabilityContextValue {
  return React.useContext(RadioAvailabilityContext);
}

export function RadioAvailabilityProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<RadioAvailabilityStatus>('checking');
  const [reason, setReason] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    const refreshAvailability = () => {
      void requestRadioHealth()
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
          setReason('radio-health-check-failed');
          setStatus('offline');
        });
    };

    refreshAvailability();
    const refreshInterval = window.setInterval(refreshAvailability, RADIO_AVAILABILITY_REFRESH_MS);

    return () => {
      active = false;
      window.clearInterval(refreshInterval);
    };
  }, []);

  const contextValue = React.useMemo(() => ({ status, reason }), [reason, status]);

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

export const RADIO_BROWSER_HEALTH_TIMEOUT_MS = CLIENT_HEALTH_TIMEOUT_MS;
