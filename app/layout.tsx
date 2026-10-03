import 'highlight.js/styles/atom-one-dark.css';
import './page-transitions.css';
import type { Metadata } from 'next';
import NavBar from '../components/NavBar';
import { PageReadinessProvider } from '../components/PageReadinessProvider';
import PageTransitionProvider from '../components/PageTransitionProvider';
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
        <PageReadinessProvider>
          <ThemeRegistry>
            <RadioAvailabilityProvider>
              <PageTransitionProvider>
                <NavBar />
                {children}
                <RadioAvailabilityGate>
                  <RadioWidget />
                </RadioAvailabilityGate>
              </PageTransitionProvider>
            </RadioAvailabilityProvider>
          </ThemeRegistry>
        </PageReadinessProvider>
      </body>
    </html>
  );
}
