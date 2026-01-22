'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Typography from '@mui/joy/Typography';
import Chip from '@mui/joy/Chip';
import Stack from '@mui/joy/Stack';
import { Calendar, User, ArrowRight, Tag } from 'lucide-react';
import type { ParsedPost } from '../../lib/blog/parser';

export type BlogCardProps = {
  post: ParsedPost;
  onClick: () => void;
  variant?: 'plain' | 'outlined' | 'soft' | 'solid';
  color?: 'primary' | 'neutral' | 'danger' | 'success' | 'warning';
};

function transformImageUrl(url: string): string {
  if (url.startsWith('/blog/')) {
    return url.replace('/blog/', '/api/blog-images/');
  }
  return url;
}

export const BlogCard = React.memo(({ post, onClick, variant = 'outlined', color = 'neutral' }: BlogCardProps) => {
  const { metadata, filename } = post;
  const decorativeImageUrl = typeof metadata.cover_image === 'string' && metadata.cover_image.length > 0
    ? transformImageUrl(metadata.cover_image)
    : null;

  // Extract date from filename if not in metadata (YYYY-MM-DD format)
  const dateFromFilename = filename.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  const displayDate = metadata.date || dateFromFilename || new Date().toISOString().split('T')[0];

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      role="article"
      variant={variant}
      color={color}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label={`Read blog post: ${metadata.title}`}
      sx={{
        position: 'relative',
        gap: 2,
        transition: 'all 0.2s',
        cursor: 'pointer',
        bgcolor: 'background.surface',
        borderColor: 'rgba(255,255,255,0.08)',
        p: 2,
        overflow: 'hidden',
        '&:hover': {
          boxShadow: 'md',
          borderColor: 'primary.500',
          transform: 'translateY(-1px)',
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.500',
        },
      }}
    >
      {decorativeImageUrl && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: { xs: 0, sm: '30%', md: '35%' },
            pointerEvents: 'none',
            backgroundImage: `url(${decorativeImageUrl})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundPosition: 'right center',
            opacity: 0.62,
            filter: 'saturate(1.08) contrast(1.06)',
            clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 35% 100%)',
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 92%, rgba(0,0,0,0) 100%)',
            maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 92%, rgba(0,0,0,0) 100%)',
          }}
        />
      )}
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 0.5 }}>
              <Typography level="title-md" sx={{ color: 'text.primary', fontWeight: 600 }}>
                {metadata.title}
              </Typography>
              {metadata.tags && metadata.tags.length > 0 && (
                <Chip
                  variant="soft"
                  color="primary"
                  size="sm"
                  startDecorator={<Tag size={12} />}
                  sx={{ '--Chip-radius': '4px', height: 20 }}
                >
                  {metadata.tags[0]}
                </Chip>
              )}
            </Stack>

            <Stack direction="row" spacing={3} alignItems="center" sx={{ color: 'text.secondary' }}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Calendar size={14} />
                <Typography level="body-xs" textColor="inherit">
                  {displayDate}
                </Typography>
              </Stack>

              {metadata.author && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <User size={14} />
                  <Typography level="body-xs" textColor="inherit">
                    {metadata.author}
                  </Typography>
                </Stack>
              )}

              <Typography level="body-xs" textColor="text.tertiary" sx={{ display: { xs: 'none', md: 'block' }, maxWidth: '500px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {metadata.summary}
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ color: 'text.tertiary' }}>
            <ArrowRight size={18} />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
});

BlogCard.displayName = 'BlogCard';
