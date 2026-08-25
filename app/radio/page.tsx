import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RadioAvailabilityGate } from '@/components/radio/RadioAvailabilityProvider';
import RadioPageClient from './RadioPageClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Radio — Midori AI',
  description: 'Listen to Midori AI Radio. Immersive listening with track stories.',
};

export default function RadioPage() {
  if (process.env.NEXT_PUBLIC_RADIO_AVAILABLE_AT_BUILD !== 'true') {
    redirect('/');
  }

  return (
    <RadioAvailabilityGate redirectWhenOffline>
      <RadioPageClient />
    </RadioAvailabilityGate>
  );
}
