'use client';

import type { TransitionEvent } from 'react';
import { PageLoadingStatus } from './PageLoadingIndicator';
import type { PageTransitionPhase } from './usePageTransitionLifecycle';

export function PageTransitionOverlay({
  phase,
  showStatus,
  stalled,
  onOpacityTransitionEnd,
  onRetry,
  onReturn,
}: {
  phase: PageTransitionPhase;
  showStatus: boolean;
  stalled: boolean;
  onOpacityTransitionEnd: () => void;
  onRetry: () => void;
  onReturn: () => void;
}) {
  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && event.propertyName === 'opacity')
      onOpacityTransitionEnd();
  };
  return (
    <div
      className={`page-transition-scrim page-transition-scrim--${phase}`}
      data-phase={phase}
      aria-hidden={phase === 'idle'}
      onTransitionEnd={handleTransitionEnd}
    >
      {showStatus && phase === 'waiting' ? <PageLoadingStatus /> : null}
      {stalled && phase === 'waiting' ? (
        <div className="page-transition-recovery">
          <p>This page is taking longer to load.</p>
          <button type="button" onClick={onRetry}>
            Try again
          </button>
          <button type="button" onClick={onReturn}>
            Return to previous page
          </button>
        </div>
      ) : null}
    </div>
  );
}
