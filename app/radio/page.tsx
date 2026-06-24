import type { Metadata } from 'next';
import RadioPageClient from './RadioPageClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Radio — Midori AI',
  description: 'Listen to Midori AI Radio. Immersive listening with track stories.',
};

export default function RadioPage() {
  return <RadioPageClient />;
}
