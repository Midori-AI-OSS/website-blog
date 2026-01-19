import 'highlight.js/styles/atom-one-dark.css';
import type { Metadata } from 'next';
import ThemeRegistry from '../components/ThemeRegistry';
import NavBar from '../components/NavBar';

export const metadata: Metadata = {
  title: 'Blog App',
  description: 'A blog built with Next.js and MUI Joy',
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
        </ThemeRegistry>
      </body>
    </html>
  );
}
