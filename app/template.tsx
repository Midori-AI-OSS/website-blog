'use client';

import * as React from 'react';
import { usePageReadiness } from '@/components/PageReadinessProvider';

const ROUTE_ENTRY_FALLBACK_MS = 900;
const useClientLayoutEffect =
  typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

export default function Template({ children }: { children: React.ReactNode }) {
  const { beginRouteEntry, completeRouteEntry } = usePageReadiness();
  const completeRouteEntryRef = React.useRef(completeRouteEntry);

  useClientLayoutEffect(() => {
    let active = true;
    let timeoutId: number | null = null;
    const complete = () => {
      if (!active) return;
      active = false;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      completeRouteEntry();
    };

    completeRouteEntryRef.current = complete;
    beginRouteEntry();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      complete();
    } else {
      timeoutId = window.setTimeout(complete, ROUTE_ENTRY_FALLBACK_MS);
    }

    return () => {
      active = false;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [beginRouteEntry, completeRouteEntry]);

  const handleAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && event.animationName === 'page-route-enter') {
      completeRouteEntryRef.current();
    }
  };

  return (
    <div className="page-route-transition" onAnimationEnd={handleAnimationEnd}>
      {children}
    </div>
  );
}
