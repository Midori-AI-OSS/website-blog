'use client';

import * as React from 'react';
import { isPageReadyForArtwork } from '@/lib/pageReadiness';

interface PageReadinessContextValue {
  pageReadyForArtwork: boolean;
  loadingFallbackCount: number;
  beginRouteEntry: () => void;
  completeRouteEntry: () => void;
  markShellVisible: () => void;
  setNavigationTransitionActive: (active: boolean) => void;
  registerLoadingFallback: () => () => void;
}

const PageReadinessContext = React.createContext<PageReadinessContextValue | null>(null);

export function PageReadinessProvider({ children }: { children: React.ReactNode }) {
  const [shellVisible, setShellVisible] = React.useState(false);
  const [routeEntryComplete, setRouteEntryComplete] = React.useState(false);
  const [loadingFallbackCount, setLoadingFallbackCount] = React.useState(0);
  const [navigationTransitionActive, setNavigationTransitionActive] = React.useState(false);

  const beginRouteEntry = React.useCallback(() => {
    setRouteEntryComplete(false);
  }, []);

  const completeRouteEntry = React.useCallback(() => {
    setRouteEntryComplete(true);
  }, []);

  const markShellVisible = React.useCallback(() => {
    setShellVisible(true);
  }, []);

  const registerLoadingFallback = React.useCallback(() => {
    let active = true;
    setLoadingFallbackCount((count) => count + 1);

    return () => {
      if (!active) return;
      active = false;
      setLoadingFallbackCount((count) => Math.max(0, count - 1));
    };
  }, []);

  const pageReadyForArtwork = isPageReadyForArtwork({
    shellVisible,
    routeEntryComplete,
    loadingFallbackCount,
    navigationTransitionActive,
  });

  const value = React.useMemo<PageReadinessContextValue>(
    () => ({
      pageReadyForArtwork,
      loadingFallbackCount,
      beginRouteEntry,
      completeRouteEntry,
      markShellVisible,
      setNavigationTransitionActive,
      registerLoadingFallback,
    }),
    [
      beginRouteEntry,
      completeRouteEntry,
      loadingFallbackCount,
      markShellVisible,
      pageReadyForArtwork,
      registerLoadingFallback,
    ],
  );

  return <PageReadinessContext.Provider value={value}>{children}</PageReadinessContext.Provider>;
}

export function usePageReadiness(): PageReadinessContextValue {
  const context = React.useContext(PageReadinessContext);
  if (!context) {
    throw new Error('usePageReadiness must be used inside PageReadinessProvider');
  }
  return context;
}
