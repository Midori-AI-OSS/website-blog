'use client';

import CssBaseline from '@mui/joy/CssBaseline';
import { CssVarsProvider } from '@mui/joy/styles';
import type * as React from 'react';
import { theme } from '../lib/theme';
import DynamicBackdropProvider from './DynamicBackdropProvider';

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <CssVarsProvider theme={theme} defaultMode="dark" disableTransitionOnChange>
      <CssBaseline />
      <DynamicBackdropProvider>{children}</DynamicBackdropProvider>
    </CssVarsProvider>
  );
}
