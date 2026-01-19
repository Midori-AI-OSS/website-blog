'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, Stack, Sheet, Grid } from '@mui/joy';
import { Gamepad2, Play, MessageSquare, Server, Monitor, ArrowRight, Youtube, Twitch, Twitter, Facebook, Mail } from 'lucide-react';
import { BlogCard } from './blog/BlogCard';
import type { ParsedPost } from '../lib/blog/parser';

interface HomePageClientProps {
    recentPosts: ParsedPost[];
}

export default function HomePageClient({ recentPosts }: HomePageClientProps) {
    const router = useRouter();

    const handlePostClick = (post: ParsedPost) => {
        // Navigate to blog post
        const slug = post.filename.replace('.md', '');
        router.push(`/blog/${slug}`);
    };

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, width: '100%', maxWidth: '1200px', mx: 'auto' }}>

            {/* Hero Section */}
            <Stack spacing={4} sx={{ mb: 8, alignItems: 'center', textAlign: 'center' }}>
                <Link href="https://io.midori-ai.xyz/" style={{ width: '100%', maxWidth: '98%', display: 'flex', justifyContent: 'center' }}>
                    <Box
                        component="img"
                        src="https://tea-cup.midori-ai.xyz/download/logo_color1.png"
                        alt="Midori AI Logo"
                        loading="lazy"
                        sx={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: 'lg',
                            // enhance the look slightly
                            filter: 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.3))', // Purple glow
                            cursor: 'pointer',
                        }}
                    />
                </Link>
                <Typography level="h1" sx={{ fontSize: { xs: '2rem', md: '3rem' } }}>
                    Welcome to Midori AI
                </Typography>
                <Typography level="body-lg" sx={{ maxWidth: '800px', mx: 'auto', color: 'text.secondary' }}>
                    We love helping people build, break, and tinker with machine learning. This is a friendly, experimental space for makers, learners, and teams to explore practical tools, try bold ideas, and ship imperfect prototypes.
                    <br /><br />
                    **This is the home of our engineering blogs and project updates.** Come mess with models, experiment loudly, and learn together — we’ll help you every step of the way.
                </Typography>
            </Stack>

            {/* Recent Updates Section */}
            <Box sx={{ mb: 8 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                    <Typography level="h2">Recent Updates</Typography>
                    <Button
                        component={Link}
                        href="/blog"
                        variant="plain"
                        endDecorator={<ArrowRight size={16} />}
                    >
                        View all
                    </Button>
                </Stack>

                <Stack spacing={2}>
                    {recentPosts.map((post) => (
                        <BlogCard
                            key={post.filename}
                            post={post}
                            onClick={() => handlePostClick(post)}
                            variant="outlined"
                        />
                    ))}
                    {recentPosts.length === 0 && (
                        <Typography level="body-md" sx={{ color: 'text.tertiary', fontStyle: 'italic' }}>
                            No blog posts found.
                        </Typography>
                    )}
                </Stack>
            </Box>

            {/* Projects Section */}
            <Box sx={{ mb: 8 }}>
                <Typography level="h2" sx={{ mb: 3 }}>Projects</Typography>
                <Grid container spacing={2}>
                    {[
                        {
                            title: "Midori AI Monorepo",
                            desc: "Central source for our projects and tooling.",
                            icon: <Server />,
                            link: "https://github.com/Midori-AI-OSS/Midori-AI"
                        },
                        {
                            title: "Pixel OS",
                            desc: "Container-first Linux distributions for Docker and ML workloads.",
                            icon: <Monitor />,
                            link: "https://io.midori-ai.xyz/pixelos/"
                        },
                        {
                            title: "Games",
                            desc: "Stained Glass Odyssey series (Endless + Idle).",
                            icon: <Gamepad2 />,
                            link: "https://io.midori-ai.xyz/games/"
                        },
                        {
                            title: "Agents Runner",
                            desc: "Run AI agents in Docker with workspace + GitHub management.",
                            icon: <Play />,
                            link: "https://io.midori-ai.xyz/agent-runner/"
                        },
                        {
                            title: "Carly",
                            desc: "An advanced conversational research project.",
                            icon: <MessageSquare />,
                            link: "https://io.midori-ai.xyz/about-us/carly-api/"
                        }
                    ].map((project, i) => (
                        <Grid key={i} xs={12} sm={6} md={4}>
                            <Sheet
                                variant="outlined"
                                sx={{
                                    p: 3,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                    bgcolor: 'rgba(19, 10, 30, 0.4)', // Purple tint
                                    backdropFilter: 'blur(12px)',
                                    borderRadius: 0,
                                    transition: 'border-color 0.2s',
                                    '&:hover': {
                                        borderColor: 'primary.500',
                                    }
                                }}
                            >
                                <Box sx={{ color: 'primary.400' }}>{project.icon}</Box>
                                <Box>
                                    <Typography level="title-lg" sx={{ mb: 1 }}>{project.title}</Typography>
                                    <Typography level="body-sm" sx={{ color: 'text.secondary' }}>{project.desc}</Typography>
                                </Box>
                                <Box sx={{ mt: 'auto', pt: 2 }}>
                                    <Button
                                        component={Link}
                                        href={project.link}
                                        variant="soft"
                                        color="neutral"
                                        size="sm"
                                        fullWidth
                                    >
                                        View Project
                                    </Button>
                                </Box>
                            </Sheet>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Socials / Footer */}
            <Box sx={{ mb: 4, pt: 4, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography level="h2" sx={{ mb: 4, textAlign: 'center' }}>Join the Conversation</Typography>
                <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={2}>
                    {[
                        { name: "Discord", icon: <MessageSquare />, link: "https://discord.gg/xdgCx3VyHU" },
                        { name: "Twitch", icon: <Twitch />, link: "https://www.twitch.tv/luna_midori5" },
                        { name: "YouTube", icon: <Youtube />, link: "https://www.youtube.com/channel/UCVQo4TxFJEoE5kccScY-xow" },
                        { name: "Twitter", icon: <Twitter />, link: "https://twitter.com/lunamidori5" },
                        { name: "Facebook", icon: <Facebook />, link: "https://www.facebook.com/TWLunagreen" },
                        { name: "Email", icon: <Mail />, link: "mailto:contact-us@midori-ai.xyz" },
                    ].map((social) => (
                        <Button
                            key={social.name}
                            component="a"
                            href={social.link}
                            target="_blank"
                            variant="outlined"
                            color="neutral"
                            startDecorator={social.icon}
                        >
                            {social.name}
                        </Button>
                    ))}
                </Stack>
                <Typography level="body-sm" sx={{ textAlign: 'center', mt: 4, color: 'text.tertiary', fontStyle: 'italic' }}>
                    Where Creativity and Innovation Blossom, Together
                </Typography>
            </Box>

        </Box>
    );
}
