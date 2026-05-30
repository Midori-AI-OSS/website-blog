'use client';

import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import CssBaseline from '@mui/joy/CssBaseline';
import { CssVarsProvider } from '@mui/joy/styles';
import type * as React from 'react';
import { theme } from '../lib/theme';
import DynamicBackdropProvider from './DynamicBackdropProvider';

const emotionCache = createCache({ key: 'mui', prepend: true });

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider value={emotionCache}>
      <CssVarsProvider theme={theme} defaultMode="dark" disableTransitionOnChange>
        <CssBaseline />
        <DynamicBackdropProvider>{children}</DynamicBackdropProvider>
      </CssVarsProvider>
    </CacheProvider>
  );
}
