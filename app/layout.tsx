import type { Metadata } from 'next';
import NavBar from '../components/NavBar';
import RadioWidget from '../components/radio/RadioWidget';
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
