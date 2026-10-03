'use client';

import CssBaseline from '@mui/joy/CssBaseline';
import { CssVarsProvider } from '@mui/joy/styles';
import * as React from 'react';
import { theme } from '../lib/theme';
import DynamicBackdropProvider from './DynamicBackdropProvider';
import { usePageReadiness } from './PageReadinessProvider';

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const useClientLayoutEffect =
    typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;
  // Client-side only to avoid hydration mismatch with dark mode preference
  const [mounted, setMounted] = React.useState(false);
  const { markShellVisible } = usePageReadiness();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  useClientLayoutEffect(() => {
    if (mounted) markShellVisible();
  }, [markShellVisible, mounted]);

  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <CssVarsProvider theme={theme} defaultMode="dark" disableTransitionOnChange>
      <CssBaseline />
      <DynamicBackdropProvider>{children}</DynamicBackdropProvider>
    </CssVarsProvider>
  );
}
