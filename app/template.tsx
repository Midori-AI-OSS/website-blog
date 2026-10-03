'use client';

import type { ReactNode } from 'react';
import { useLayoutEffect } from 'react';
import { usePageReadiness } from '@/components/PageReadinessProvider';

export default function Template({ children }: { children: ReactNode }) {
  const { completeRouteEntry } = usePageReadiness();
  useLayoutEffect(() => completeRouteEntry(), [completeRouteEntry]);
  return <div className="page-route-content">{children}</div>;
}
