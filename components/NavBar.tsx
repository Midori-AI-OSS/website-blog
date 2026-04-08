'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemButton from '@mui/joy/ListItemButton';
import ListItemDecorator from '@mui/joy/ListItemDecorator';
import Typography from '@mui/joy/Typography';
import { Home, BookOpen, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavBar() {
    const pathname = usePathname();

    const items = [
        { name: 'Home', icon: <Home size={18} />, path: '/' },
        { name: 'Blog', icon: <BookOpen size={18} />, path: '/blog' },
        { name: 'Lore', icon: <LayoutDashboard size={18} />, path: '/lore' },
    ];

    return (
        <Box
            component="nav"
            aria-label="Primary navigation"
            sx={{
                p: { xs: 1, sm: 2 },
                borderBottom: '1px solid',
                borderColor: 'background.level2',
                bgcolor: 'background.surface',
                backdropFilter: 'blur(12px)',
            }}
        >
            <List
                component="ul"
                sx={{
                    '--List-radius': '0px',
                    '--List-padding': '0px',
                    display: { xs: 'grid', sm: 'none' },
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 0,
                    width: '100%',
                    m: 0,
                    p: 0,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'background.level2',
                    bgcolor: 'background.level1',
                }}
            >
                {items.map((item, index) => {
                    const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));

                    return (
                        <ListItem key={item.path} role="none" sx={{ width: '100%', minWidth: 0 }}>
                            <ListItemButton
                                component={Link}
                                href={item.path}
                                aria-current={isActive ? 'page' : undefined}
                                sx={{
                                    color: isActive ? 'text.primary' : 'text.secondary',
                                    bgcolor: isActive ? 'rgba(139, 92, 246, 0.18)' : 'transparent',
                                    borderRadius: 0,
                                    borderRight: index < items.length - 1 ? '1px solid' : 'none',
                                    borderColor: 'background.level2',
                                    minHeight: 56,
                                    width: '100%',
                                    px: 1,
                                    py: 1,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    gap: 0.75,
                                    textAlign: 'center',
                                    transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
                                    '&:hover': {
                                        bgcolor: isActive ? 'rgba(139, 92, 246, 0.24)' : 'rgba(255,255,255,0.06)',
                                        color: 'text.primary',
                                    },
                                    '&:focus-visible': {
                                        outline: '2px solid',
                                        outlineColor: 'primary.500',
                                        outlineOffset: '-2px',
                                    },
                                }}
                            >
                                <Box component="span" sx={{ display: 'inline-flex', color: 'inherit', flexShrink: 0 }}>
                                    {item.icon}
                                </Box>
                                <Typography level="title-sm" textColor="inherit">
                                    {item.name}
                                </Typography>
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>

            <List
                role="menubar"
                orientation="horizontal"
                sx={{
                    '--List-radius': '0px',
                    '--List-padding': '0px',
                    '--List-gap': '8px',
                    display: { xs: 'none', sm: 'flex' },
                    flexDirection: 'row',
                    width: '100%',
                }}
            >
                {items.map((item) => {
                    const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
                    return (
                        <ListItem key={item.path} role="none" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                            <ListItemButton
                                role="menuitem"
                                component={Link}
                                href={item.path}
                                selected={isActive}
                                sx={{
                                    color: isActive ? 'text.primary' : 'text.secondary',
                                    bgcolor: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                                    border: '1px solid',
                                    borderColor: isActive ? 'primary.500' : 'transparent',
                                    borderRadius: 0,
                                    minHeight: 44,
                                    width: { xs: '100%', sm: 'auto' },
                                    justifyContent: { xs: 'flex-start', sm: 'center' },
                                    px: { xs: 1.5, sm: 2 },
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        bgcolor: 'rgba(255,255,255,0.08)',
                                        borderColor: 'primary.400',
                                        color: 'text.primary',
                                    },
                                }}
                            >
                                <ListItemDecorator sx={{ color: 'inherit' }}>{item.icon}</ListItemDecorator>
                                <Typography level="title-sm" textColor="inherit">
                                    {item.name}
                                </Typography>
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Box>
    );
}
