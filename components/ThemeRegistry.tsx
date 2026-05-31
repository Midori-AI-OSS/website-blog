'use client';

import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import CssBaseline from '@mui/joy/CssBaseline';
import { CssVarsProvider } from '@mui/joy/styles';
import { useServerInsertedHTML } from 'next/navigation';
import type * as React from 'react';
import { useState } from 'react';
import { theme } from '../lib/theme';
import DynamicBackdropProvider from './DynamicBackdropProvider';

let stableCache: ReturnType<typeof createCache> | null = null;

function getStableCache() {
  if (!stableCache) {
    stableCache = createCache({ key: 'mui', prepend: true });
  }
  return stableCache;
}

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [cache] = useState(() =>
    typeof window !== 'undefined' ? getStableCache() : createCache({ key: 'mui', prepend: true }),
  );

  useServerInsertedHTML(() => {
    const inserted = cache.inserted;
    const names = Object.keys(inserted);
    if (names.length === 0) return null;

    let styles = '';
    for (const name of names) {
      styles += inserted[name];
    }

    return (
      <style
        key="emotion-ssr"
        data-emotion={cache.key}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Emotion SSR style extraction
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return (
    <CacheProvider value={cache}>
      <CssVarsProvider theme={theme} defaultMode="dark" disableTransitionOnChange>
        <CssBaseline />
        <DynamicBackdropProvider>{children}</DynamicBackdropProvider>
      </CssVarsProvider>
    </CacheProvider>
  );
}
