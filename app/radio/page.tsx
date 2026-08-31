import type { Metadata } from 'next';
import { RadioAvailabilityGate } from '@/components/radio/RadioAvailabilityProvider';
import RadioPageClient from './RadioPageClient';

export const metadata: Metadata = {
  title: 'Radio — Midori AI',
  description: 'Listen to Midori AI Radio. Immersive listening with track stories.',
};

export default function RadioPage() {
  return (
    <RadioAvailabilityGate redirectWhenOffline>
      <RadioPageClient />
    </RadioAvailabilityGate>
  );
}
