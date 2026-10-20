'use client';

import { useEffect, useRef, useState } from 'react';

export function useNearViewport<T extends HTMLElement>(deferred: boolean) {
  const ref = useRef<T>(null);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (!deferred || activated || !ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setActivated(true);
        observer.disconnect();
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [deferred, activated]);

  return { ref, shouldLoad: !deferred || activated };
}
