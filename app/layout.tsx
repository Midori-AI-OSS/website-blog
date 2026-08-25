import 'highlight.js/styles/atom-one-dark.css';
import type { Metadata } from 'next';
import NavBar from '../components/NavBar';
import {
  RadioAvailabilityGate,
  RadioAvailabilityProvider,
} from '../components/radio/RadioAvailabilityProvider';
import RadioWidget from '../components/radio/RadioWidget';
import ThemeRegistry from '../components/ThemeRegistry';

export const metadata: Metadata = {
  title: 'Midori AI Blog',
  description: 'Where Creativity and Innovation Blossom, Together',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeRegistry>
          <RadioAvailabilityProvider>
            <NavBar />
            {children}
            <RadioAvailabilityGate>
              <RadioWidget />
            </RadioAvailabilityGate>
          </RadioAvailabilityProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
