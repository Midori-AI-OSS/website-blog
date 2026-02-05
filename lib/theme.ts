import { extendTheme } from '@mui/joy/styles';

declare module '@mui/joy/styles' {
    interface PaletteBackground {
        appBody: string;
        componentBg: string;
    }
}

export const theme = extendTheme({
    colorSchemes: {
        dark: {
            palette: {
                background: {
                    body: '#05040a', // Deep dark purple-black
                    surface: 'rgba(19, 10, 30, 0.6)', // Translucent purple tint
                    level1: 'rgba(29, 14, 45, 0.6)',
                    level2: 'rgba(44, 21, 68, 0.6)',
                    appBody: '#05040a',
                    componentBg: 'rgba(19, 10, 30, 0.6)',
                },
                primary: {
                    50: '#f5f3ff',
                    100: '#ede9fe',
                    200: '#ddd6fe',
                    300: '#c4b5fd',
                    400: '#a78bfa',
                    500: '#8b5cf6', // Vivid Purple
                    600: '#7c3aed',
                    700: '#6d28d9',
                    800: '#5b21b6',
                    900: '#4c1d95',
                },
                neutral: {
                    50: '#f9fafb',
                    100: '#f3f4f6',
                    200: '#e5e7eb',
                    300: '#d1d5db',
                    400: '#9ca3af',
                    500: '#6b7280',
                    600: '#4b5563',
                    700: '#374151',
                    800: '#1f2937',
                    900: '#111827',
                },
                text: {
                    primary: '#e2e8f0',
                    secondary: '#94a3b8',
                },
            },
        },
    },
    fontFamily: {
        body: 'Inter, var(--joy-fontFamily-fallback)',
        display: 'Inter, var(--joy-fontFamily-fallback)',
    },
    radius: {
        xs: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
    },
    components: {
        JoyCard: {
            styleOverrides: {
                root: ({ theme }) => ({
                    backgroundColor: 'rgba(19, 10, 30, 0.4)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 0,
                    boxShadow: 'none',
                    transition: 'transform 0.2s, border-color 0.2s, background-color 0.2s',
                    '&:hover': {
                        backgroundColor: 'rgba(19, 10, 30, 0.6)',
                        borderColor: theme.vars.palette.primary[400],
                        boxShadow: `0 0 15px -5px ${theme.vars.palette.primary[400]}`,
                    },
                }),
            },
        },
        JoySheet: {
            styleOverrides: {
                root: {
                    backgroundColor: 'rgba(19, 10, 30, 0.4)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: 0,
                }
            }
        },
        JoyButton: {
            styleOverrides: {
                root: {
                    borderRadius: 0,
                    backdropFilter: 'blur(4px)',
                    transition: 'all 0.2s',
                },
            },
        },
        JoyInput: {
            styleOverrides: {
                root: {
                    borderRadius: 0,
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(4px)',
                },
            },
        },
        JoyListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 0,
                }
            }
        },
        JoyChip: {
            styleOverrides: {
                root: {
                    borderRadius: 0,
                    '--Chip-radius': '0px',
                }
            }
        }
    },
});
