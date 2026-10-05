'use client';

import { useRouter } from 'next/navigation';
import type { MouseEvent, ReactNode } from 'react';
import { createContext, Suspense, useContext } from 'react';
import { getInternalPageTransitionHref } from '@/lib/pageTransitions';
import { usePageReadiness } from './PageReadinessProvider';
import { PageRouteObserver } from './PageRouteObserver';
import { PageTransitionOverlay } from './PageTransitionOverlay';
import {
  type PageNavigationOptions,
  type PageTransitionPhase,
  usePageTransitionLifecycle,
} from './usePageTransitionLifecycle';

type Navigate = (href: string, options?: PageNavigationOptions) => void;
const PageTransitionContext = createContext<Navigate | null>(null);
const PageTransitionPhaseContext = createContext<PageTransitionPhase>('idle');

export function PageTransitionContent({ children }: { children: ReactNode }) {
  const phase = useContext(PageTransitionPhaseContext);
  return (
    <div className="page-transition-root" aria-busy={phase !== 'idle'} inert={phase !== 'idle'}>
      {children}
    </div>
  );
}

export function usePageTransition(): Navigate {
  const navigate = useContext(PageTransitionContext);
  if (!navigate) throw new Error('usePageTransition must be used inside PageTransitionProvider');
  return navigate;
}

export default function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { shellVisible, routeEntryComplete, loadingFallbackCount, setNavigationTransitionActive } =
    usePageReadiness();
  const transition = usePageTransitionLifecycle({
    router,
    shellReady: shellVisible && routeEntryComplete,
    loadingFallbackCount,
    setNavigationTransitionActive,
  });

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    if (!(event.target instanceof Element)) return;
    const anchor = event.target.closest<HTMLAnchorElement>('a[href]');
    if (
      !anchor ||
      anchor.hasAttribute('download') ||
      (anchor.target && anchor.target !== '_self') ||
      anchor.relList.contains('external')
    )
      return;
    const destination = getInternalPageTransitionHref(anchor.href, window.location.href);
    const primaryNavigation = Boolean(anchor.closest('nav[aria-label="Primary navigation"]'));
    const target = new URL(anchor.href);
    if (
      !destination &&
      !(
        primaryNavigation &&
        transition.phase !== 'idle' &&
        target.origin === window.location.origin
      )
    )
      return;
    event.preventDefault();
    transition.navigate(destination ?? target.pathname + target.search + target.hash, {
      interrupt: primaryNavigation,
    });
  };

  return (
    <PageTransitionContext.Provider value={transition.navigate}>
      <Suspense fallback={null}>
        <PageRouteObserver onCommit={transition.routeCommitted} />
      </Suspense>
      <PageTransitionPhaseContext.Provider value={transition.phase}>
        <div onClickCapture={handleClickCapture}>{children}</div>
      </PageTransitionPhaseContext.Provider>
      <PageTransitionOverlay
        phase={transition.phase}
        showStatus={transition.showStatus}
        stalled={transition.stalled}
        onOpacityTransitionEnd={transition.onOpacityTransitionEnd}
        onRetry={transition.retry}
        onReturn={transition.returnToPage}
      />
    </PageTransitionContext.Provider>
  );
}
