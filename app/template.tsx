'use client';

import type { ReactNode } from 'react';
import { useLayoutEffect } from 'react';
import { useOptionalPageReadiness } from '@/components/PageReadinessProvider';

export default function Template({ children }: { children: ReactNode }) {
  const completeRouteEntry = useOptionalPageReadiness()?.completeRouteEntry;
  useLayoutEffect(() => completeRouteEntry?.(), [completeRouteEntry]);
  return <div className="page-route-content">{children}</div>;
}
