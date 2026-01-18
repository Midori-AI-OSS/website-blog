import type { Metadata } from 'next';

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
