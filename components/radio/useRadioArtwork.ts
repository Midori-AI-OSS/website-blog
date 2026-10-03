'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { preloadImage } from '@/lib/radio/images';

/** Page readiness schedules new work; it never invalidates existing artwork. */
export function useRadioArtwork({
  identity,
  serverUrl,
  fallbackUrl,
  placeholderUrl,
  canStart,
}: {
  identity: string;
  serverUrl: string | null;
  fallbackUrl: string;
  placeholderUrl: string;
  canStart: boolean;
}): string | null {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const key = JSON.stringify([identity, serverUrl, fallbackUrl, placeholderUrl]);
  const latestKey = useRef(key);
  const allowed = useRef(canStart);
  const requestedKey = useRef<string | null>(null);
  const progress = useRef<{ key: string; nextIndex: number } | null>(null);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    latestKey.current = key;
    allowed.current = canStart;
  }, [key, canStart]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!canStart || requestedKey.current === key) return;
    requestedKey.current = key;
    const candidates = [...new Set([serverUrl, fallbackUrl, placeholderUrl])].filter(
      (url): url is string => Boolean(url),
    );
    if (progress.current?.key !== key) progress.current = { key, nextIndex: 0 };
    const job = progress.current;
    const resolve = async () => {
      while (job.nextIndex < candidates.length) {
        if (!allowed.current) {
          requestedKey.current = null;
          return;
        }
        const url = candidates[job.nextIndex];
        if (url === undefined) return;
        const loaded = await preloadImage(url);
        if (!mounted.current || latestKey.current !== key) return;
        job.nextIndex++;
        if (loaded) {
          setLoadedUrl(url);
          return;
        }
      }
    };
    void resolve();
    // An in-flight image remains valid across page transitions. Only its
    // artwork identity or actual component unmount can discard the result.
  }, [canStart, key, serverUrl, fallbackUrl, placeholderUrl]);

  return loadedUrl;
}
