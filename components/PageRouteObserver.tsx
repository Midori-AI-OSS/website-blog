'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useLayoutEffect } from 'react';
import { getPageRouteKey } from '@/lib/pageTransitions';

export function PageRouteObserver({ onCommit }: { onCommit: (key: string) => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? '';
  const key = getPageRouteKey(
    new URL(`${pathname ?? '/'}${search ? `?${search}` : ''}`, 'http://route.local'),
  );
  useLayoutEffect(() => onCommit(key), [key, onCommit]);
  return null;
}
