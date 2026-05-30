import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import NavBar from '../components/NavBar';

const RadioWidget = dynamic(() => import('../components/radio/RadioWidget'), {
  ssr: false,
  loading: () => null,
});

import ThemeRegistry from '../components/ThemeRegistry';

export const metadata: Metadata = {
  title: 'Midori AI Blog',
  description: 'Where Creativity and Innovation Blossom, Together',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: FOUC prevention
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('mui-mode')||'dark';document.documentElement.setAttribute('data-mui-color-scheme',m);}catch(e){}})();`,
          }}
        />
      </head>
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
