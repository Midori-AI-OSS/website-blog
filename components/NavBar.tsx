'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemButton from '@mui/joy/ListItemButton';
import ListItemDecorator from '@mui/joy/ListItemDecorator';
import Typography from '@mui/joy/Typography';
import { Home, BookOpen, Settings, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavBar() {
    const pathname = usePathname();

    const items = [
        { name: 'Home', icon: <Home size={18} />, path: '/' },
        { name: 'Blog', icon: <BookOpen size={18} />, path: '/blog' },
    ];

    return (
        <Box
            component="nav"
            sx={{
                p: 2,
                borderBottom: '1px solid',
                borderColor: 'background.level2',
                bgcolor: 'background.surface',
                backdropFilter: 'blur(12px)',
            }}
        >
            <List
                role="menubar"
                orientation="horizontal"
                sx={{
                    '--List-radius': '0px',
                    '--List-padding': '0px',
                    '--List-gap': '8px',
                    display: 'flex',
                }}
            >
                {items.map((item) => {
                    const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
                    return (
                        <ListItem key={item.path} role="none">
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
                                    minHeight: 40,
                                    px: 2,
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
