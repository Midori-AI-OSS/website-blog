'use client';

import { useRouter } from 'next/navigation';
import type { MouseEvent, ReactNode, TransitionEvent } from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getInternalPageTransitionHref } from '@/lib/pageTransitions';

type TransitionState = 'idle' | 'leaving' | 'entering';

const EXIT_DURATION_MS = 220;
const ENTER_DURATION_MS = 260;
const TRANSITION_FALLBACK_MS = Math.max(EXIT_DURATION_MS, ENTER_DURATION_MS) + 260;

const PageTransitionContext = createContext<((href: string) => void) | null>(null);

export function usePageTransition() {
  const navigate = useContext(PageTransitionContext);
  if (!navigate) throw new Error('usePageTransition must be used inside PageTransitionProvider');
  return navigate;
}

export default function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [transitionState, setTransitionState] = useState<TransitionState>('idle');
  const transitionStateRef = useRef<TransitionState>('idle');
  const pendingDestinationRef = useRef<string | null>(null);
  const exitTimeoutRef = useRef<number | null>(null);
  const enterTimeoutRef = useRef<number | null>(null);

  const updateTransitionState = useCallback((nextState: TransitionState) => {
    transitionStateRef.current = nextState;
    setTransitionState(nextState);
  }, []);

  const finishTransitionIn = useCallback(() => {
    if (transitionStateRef.current !== 'entering') return;
    if (enterTimeoutRef.current !== null) window.clearTimeout(enterTimeoutRef.current);
    enterTimeoutRef.current = null;
    updateTransitionState('idle');
  }, [updateTransitionState]);

  const finishTransitionOut = useCallback(() => {
    if (transitionStateRef.current !== 'leaving') return;
    const destination = pendingDestinationRef.current;
    if (!destination) return;

    if (exitTimeoutRef.current !== null) window.clearTimeout(exitTimeoutRef.current);
    exitTimeoutRef.current = null;
    pendingDestinationRef.current = null;
    router.push(destination);
    updateTransitionState('entering');
    enterTimeoutRef.current = window.setTimeout(finishTransitionIn, TRANSITION_FALLBACK_MS);
  }, [finishTransitionIn, router, updateTransitionState]);

  const navigate = useCallback(
    (href: string) => {
      const destination = getInternalPageTransitionHref(href, window.location.href);
      if (!destination) {
        router.push(href);
        return;
      }
      if (transitionStateRef.current !== 'idle') return;

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        router.push(destination);
        return;
      }

      pendingDestinationRef.current = destination;
      updateTransitionState('leaving');
      exitTimeoutRef.current = window.setTimeout(finishTransitionOut, TRANSITION_FALLBACK_MS);
    },
    [finishTransitionOut, router, updateTransitionState],
  );

  useEffect(
    () => () => {
      if (exitTimeoutRef.current !== null) window.clearTimeout(exitTimeoutRef.current);
      if (enterTimeoutRef.current !== null) window.clearTimeout(enterTimeoutRef.current);
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

  return (
    <PageTransitionContext.Provider value={navigate}>
      <div className="page-transition-root" onClickCapture={handleClickCapture}>
        {children}
        <div className={scrimClassName} aria-hidden="true" onTransitionEnd={handleTransitionEnd} />
      </div>
    </PageTransitionContext.Provider>
  );
}
