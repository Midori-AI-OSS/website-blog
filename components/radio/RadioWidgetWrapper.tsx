'use client';

import dynamic from 'next/dynamic';

const RadioWidget = dynamic(() => import('./RadioWidget'), {
  ssr: false,
  loading: () => null,
});

export default RadioWidget;
