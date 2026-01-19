'use client';

import * as React from 'react';
import { CssVarsProvider } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import { theme } from '../lib/theme';

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
    // Client-side only to avoid hydration mismatch with dark mode preference
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div style={{ visibility: 'hidden' }}>{children}</div>
        );
    }

    return (
        <CssVarsProvider theme={theme} defaultMode="dark" disableTransitionOnChange>
            <CssBaseline />
            {children}
        </CssVarsProvider>
    );
}
