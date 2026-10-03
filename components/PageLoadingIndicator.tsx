'use client';

import * as React from 'react';
import { usePageReadiness } from './PageReadinessProvider';

export function PageLoadingIndicator() {
  const { registerLoadingFallback } = usePageReadiness();
  const useClientLayoutEffect =
    typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

  useClientLayoutEffect(() => registerLoadingFallback(), [registerLoadingFallback]);

  return (
    <main className="page-loading" aria-busy="true">
      <div className="page-loading__status" role="status" aria-live="polite">
        <span className="page-loading__spinner" aria-hidden="true" />
        <span>Loading page</span>
      </div>
    </main>
  );
}
