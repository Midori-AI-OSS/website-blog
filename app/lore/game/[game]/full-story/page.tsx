import { notFound } from 'next/navigation';
import { AspectRatio, Box, Button, Card, Divider, Stack, Typography } from '@mui/joy';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { ArrowLeft } from 'lucide-react';

import { toLoreImageApiUrl, transformPostImageUrl } from '@/lib/content/imageUrl';
import { loadLoreGameGroups, getLorePovPosts, sortLorePosts } from '@/lib/lore/loader';

export const dynamic = 'force-dynamic';

function replaceLoreImageTokens(markdown: string): string {
  return markdown.replace(/\{\{\s*image\s*:\s*([^}]+?)\s*\}\}/gi, (fullMatch, tokenValue: string) => {
    const url = toLoreImageApiUrl(tokenValue);
    if (!url) return fullMatch;
    return `\n\n![](${url})\n\n`;
  });
}

function toSentenceCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getSlugFromFilename(filename: string): string {
  return filename.replace(/\.md$/i, '');
}

export default async function LoreGameFullStoryPage({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const { game } = await params;
  const gameGroups = await loadLoreGameGroups();
  const group = gameGroups.find((candidate) => candidate.game.slug === game);

  if (!group) {
    notFound();
  }

  const povPosts = getLorePovPosts(group.posts, group.game.slug, group.game.fullStoryPov);
  const storyPosts = povPosts.length > 0 ? povPosts : sortLorePosts(group.posts, 'story_order_asc');
  const cover = group.game.coverImage ? transformPostImageUrl(group.game.coverImage) : null;
  const povLabel = toSentenceCase(group.game.fullStoryPov.replace(/-/g, ' '));

  return (
    <Box
      component="article"
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', sm: '100%', md: '90%', lg: '80%' },
        mx: 'auto',
        px: { xs: 0, sm: 4 },
        py: { xs: 2.5, sm: 6 },
      }}
    >
      <Button
        component="a"
        href="/lore"
        variant="plain"
        color="neutral"
        startDecorator={<ArrowLeft size={18} />}
        sx={{
          mb: { xs: 2, sm: 4 },
          minHeight: 44,
          width: { xs: '100%', sm: 'auto' },
          justifyContent: 'flex-start',
        }}
      >
        Back to lore
      </Button>

      <Card
        variant="outlined"
        sx={{
          borderRadius: 0,
          bgcolor: 'rgba(12, 14, 22, 0.72)',
          borderColor: 'rgba(255,255,255,0.12)',
          p: { xs: 1.5, sm: 2.25 },
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Box sx={{ width: { xs: '100%', md: '34%' }, minWidth: 0 }}>
            <AspectRatio
              ratio="16/10"
              sx={{
                borderRadius: 0,
                border: '1px solid',
                borderColor: 'rgba(255,255,255,0.1)',
                overflow: 'hidden',
                bgcolor: 'rgba(5,8,14,0.8)',
              }}
            >
              {cover ? (
                <Box
                  component="img"
                  src={cover}
                  alt={`${group.game.title} cover`}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                    No cover art
                  </Typography>
                </Box>
              )}
            </AspectRatio>
          </Box>

          <Stack spacing={1} sx={{ flex: 1 }}>
            <Typography level="h1" sx={{ fontSize: { xs: '1.9rem', sm: '2.4rem' }, lineHeight: 1.1 }}>
              {group.game.title} - Full Story
            </Typography>
            <Typography level="title-md" sx={{ color: 'primary.300' }}>
              POV: {povLabel}
            </Typography>
            <Typography level="body-md" sx={{ color: 'text.secondary', fontSize: { xs: '1rem', sm: '1.04rem' }, lineHeight: 1.65 }}>
              {group.game.summary}
            </Typography>
            <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
              {storyPosts.length} chapter{storyPosts.length === 1 ? '' : 's'} compiled in story order.
            </Typography>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

        <Stack spacing={2}>
          {storyPosts.map((post) => (
            <Card
              key={post.filename}
              variant="soft"
              sx={{
                borderRadius: 0,
                border: '1px solid',
                borderColor: 'rgba(255,255,255,0.1)',
                bgcolor: 'rgba(8, 10, 16, 0.75)',
                p: { xs: 1.25, sm: 2 },
              }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography level="h2" sx={{ fontSize: { xs: '1.2rem', sm: '1.45rem' } }}>
                    {post.metadata.title}
                  </Typography>
                  {post.metadata.date && (
                    <Typography level="body-sm" sx={{ color: 'text.tertiary', mt: 0.25 }}>
                      {post.metadata.date}
                    </Typography>
                  )}
                </Box>

                <Button
                  component="a"
                  href={`/lore/${getSlugFromFilename(post.filename)}`}
                  variant="outlined"
                  color="neutral"
                  sx={{
                    minHeight: 44,
                    borderRadius: 0,
                    textTransform: 'none',
                    alignSelf: { xs: 'stretch', sm: 'flex-start' },
                  }}
                >
                  Open chapter
                </Button>
              </Stack>

              {post.metadata.summary && (
                <Typography level="body-sm" sx={{ mt: 1, color: 'text.secondary', lineHeight: 1.55 }}>
                  {post.metadata.summary}
                </Typography>
              )}

              <Box
                sx={{
                  mt: 1.5,
                  fontSize: { xs: '1rem', sm: '1.03rem' },
                  lineHeight: 1.75,
                  color: 'text.secondary',
                  '& h1, & h2, & h3': { color: 'primary.300' },
                  '& p': { mb: 2 },
                  '& ul, & ol': { pl: 2.5, mb: 2 },
                  '& a': { color: 'primary.300' },
                  '& img': {
                    maxWidth: '100%',
                    height: 'auto',
                    display: 'block',
                    my: 2.5,
                    border: '1px solid',
                    borderColor: 'rgba(255,255,255,0.12)',
                  },
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                  {replaceLoreImageTokens(post.content)}
                </ReactMarkdown>
              </Box>
            </Card>
          ))}
        </Stack>
      </Card>
    </Box>
  );
}
