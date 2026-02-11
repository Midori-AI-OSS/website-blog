import 'highlight.js/styles/atom-one-dark.css';
import type { Metadata } from 'next';
import ThemeRegistry from '../components/ThemeRegistry';
import NavBar from '../components/NavBar';
import RadioWidget from '../components/radio/RadioWidget';

export const metadata: Metadata = {
  title: 'Midori AI Blog',
  description: 'Where Creativity and Innovation Blossom, Together',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeRegistry>
          <NavBar />
          {children}
          <RadioWidget />
        </ThemeRegistry>
      </body>
    </html>
  );
}
