'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { MouseEvent, ReactNode, TransitionEvent } from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getInternalPageTransitionHref } from '@/lib/pageTransitions';
import { PageLoadingStatus } from './PageLoadingIndicator';
import { usePageReadiness } from './PageReadinessProvider';

type TransitionState = 'idle' | 'leaving' | 'entering';

const EXIT_DURATION_MS = 220;
const ENTER_DURATION_MS = 260;
const TRANSITION_FALLBACK_MS = Math.max(EXIT_DURATION_MS, ENTER_DURATION_MS) + 260;
const NAVIGATION_LOADING_DELAY_MS = 150;

const PageTransitionContext = createContext<((href: string) => void) | null>(null);

export function usePageTransition() {
  const navigate = useContext(PageTransitionContext);
  if (!navigate) throw new Error('usePageTransition must be used inside PageTransitionProvider');
  return navigate;
}

export default function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loadingFallbackCount, setNavigationTransitionActive } = usePageReadiness();
  const [transitionState, setTransitionState] = useState<TransitionState>('idle');
  const [pendingNavigationSourcePath, setPendingNavigationSourcePath] = useState<string | null>(
    null,
  );
  const [navigationLoadingDelayElapsed, setNavigationLoadingDelayElapsed] = useState(false);
  const transitionStateRef = useRef<TransitionState>('idle');
  const pendingDestinationRef = useRef<string | null>(null);
  const exitTimeoutRef = useRef<number | null>(null);
  const enterTimeoutRef = useRef<number | null>(null);
  const navigationLoadingTimeoutRef = useRef<number | null>(null);
  const pendingNavigationTokenRef = useRef(0);

  const updateTransitionState = useCallback((nextState: TransitionState) => {
    transitionStateRef.current = nextState;
    setTransitionState(nextState);
  }, []);

  const startPendingNavigation = useCallback(() => {
    const token = pendingNavigationTokenRef.current + 1;
    pendingNavigationTokenRef.current = token;
    const sourcePath = pathname ?? window.location.pathname;

    if (navigationLoadingTimeoutRef.current !== null) {
      window.clearTimeout(navigationLoadingTimeoutRef.current);
    }
    setPendingNavigationSourcePath(sourcePath);
    setNavigationLoadingDelayElapsed(false);
    navigationLoadingTimeoutRef.current = window.setTimeout(() => {
      if (pendingNavigationTokenRef.current !== token) return;
      navigationLoadingTimeoutRef.current = null;
      setNavigationLoadingDelayElapsed(true);
    }, NAVIGATION_LOADING_DELAY_MS);
  }, [pathname]);

  const clearPendingNavigation = useCallback(() => {
    pendingNavigationTokenRef.current += 1;
    if (navigationLoadingTimeoutRef.current !== null) {
      window.clearTimeout(navigationLoadingTimeoutRef.current);
      navigationLoadingTimeoutRef.current = null;
    }
    setPendingNavigationSourcePath(null);
    setNavigationLoadingDelayElapsed(false);
  }, []);

  const finishTransitionIn = useCallback(() => {
    if (transitionStateRef.current !== 'entering') return;
    if (enterTimeoutRef.current !== null) window.clearTimeout(enterTimeoutRef.current);
    enterTimeoutRef.current = null;
    setNavigationTransitionActive(false);
    updateTransitionState('idle');
  }, [setNavigationTransitionActive, updateTransitionState]);

  const finishTransitionOut = useCallback(() => {
    if (transitionStateRef.current !== 'leaving') return;
    const destination = pendingDestinationRef.current;
    if (!destination) return;

    if (exitTimeoutRef.current !== null) window.clearTimeout(exitTimeoutRef.current);
    exitTimeoutRef.current = null;
    pendingDestinationRef.current = null;
    startPendingNavigation();
    router.push(destination);
    updateTransitionState('entering');
    enterTimeoutRef.current = window.setTimeout(finishTransitionIn, TRANSITION_FALLBACK_MS);
  }, [finishTransitionIn, router, startPendingNavigation, updateTransitionState]);

  const navigate = useCallback(
    (href: string) => {
      const destination = getInternalPageTransitionHref(href, window.location.href);
      if (!destination) {
        router.push(href);
        return;
      }
      if (transitionStateRef.current !== 'idle') return;

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        startPendingNavigation();
        router.push(destination);
        return;
      }

      pendingDestinationRef.current = destination;
      setNavigationTransitionActive(true);
      updateTransitionState('leaving');
      exitTimeoutRef.current = window.setTimeout(finishTransitionOut, TRANSITION_FALLBACK_MS);
    },
    [
      finishTransitionOut,
      router,
      setNavigationTransitionActive,
      startPendingNavigation,
      updateTransitionState,
    ],
  );

  useEffect(() => {
    if (pendingNavigationSourcePath === null || pendingNavigationSourcePath === pathname) return;
    clearPendingNavigation();
  }, [clearPendingNavigation, pathname, pendingNavigationSourcePath]);

  useEffect(
    () => () => {
      if (exitTimeoutRef.current !== null) window.clearTimeout(exitTimeoutRef.current);
      if (enterTimeoutRef.current !== null) window.clearTimeout(enterTimeoutRef.current);
      if (navigationLoadingTimeoutRef.current !== null) {
        window.clearTimeout(navigationLoadingTimeoutRef.current);
      }
    },
    [],
  );

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    const anchor = target.closest<HTMLAnchorElement>('a[href]');
    if (!anchor) return;

    const destination = getInternalPageTransitionHref(anchor.href, window.location.href);
    if (!destination) return;

    const modifiedClick = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (
      modifiedClick ||
      event.button !== 0 ||
      anchor.hasAttribute('download') ||
      (anchor.target && anchor.target !== '_self') ||
      anchor.relList.contains('external')
    ) {
      return;
    }

    event.preventDefault();
    navigate(destination);
  };

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'opacity') return;
    if (transitionStateRef.current === 'leaving') finishTransitionOut();
    else if (transitionStateRef.current === 'entering') finishTransitionIn();
  };

  const scrimClassName =
    transitionState === 'idle'
      ? 'page-transition-scrim'
      : `page-transition-scrim page-transition-scrim--${transitionState}`;
  const showTransitionLoader =
    navigationLoadingDelayElapsed &&
    pendingNavigationSourcePath !== null &&
    pendingNavigationSourcePath === pathname &&
    loadingFallbackCount === 0;

  return (
    <PageTransitionContext.Provider value={navigate}>
      <div
        className="page-transition-root"
        aria-busy={showTransitionLoader}
        inert={showTransitionLoader}
        onClickCapture={handleClickCapture}
      >
        {children}
        <div className={scrimClassName} aria-hidden="true" onTransitionEnd={handleTransitionEnd} />
      </div>
      {showTransitionLoader ? (
        <div className="page-transition-loader">
          <PageLoadingStatus />
        </div>
      ) : null}
    </PageTransitionContext.Provider>
  );
}
