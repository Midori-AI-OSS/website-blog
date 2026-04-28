import { notFound } from 'next/navigation'
import { Box, Button, Card, Chip, Divider, Stack, Typography } from '@mui/joy'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { ArrowLeft } from 'lucide-react'

import { AmbientCoverArt, AMBIENT_PULSE_KEYFRAMES } from '@/components/blog/AmbientCoverArt'
import { toLoreImageApiUrl, transformPostImageUrl } from '@/lib/content/imageUrl'
import { loadLoreGameGroups, getLorePovPosts, sortLorePosts } from '@/lib/lore/loader'

export const dynamic = 'force-dynamic'

const LORE_IMAGE_TOKEN_TITLE = 'lore-token'

function replaceLoreImageTokens(markdown: string): string {
  return markdown.replace(/\{\{\s*image\s*:\s*([^}]+?)\s*\}\}/gi, (fullMatch, tokenValue: string) => {
    const url = toLoreImageApiUrl(tokenValue)
    if (!url) return fullMatch

    const raw = tokenValue.trim()
    const basename = raw.split('/').filter(Boolean).pop() ?? 'image'
    const alt = basename
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim() || 'Lore image'

    return `\n\n![${alt}](${url} "${LORE_IMAGE_TOKEN_TITLE}")\n\n`
  })
}

function toSentenceCase(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function getSlugFromFilename(filename: string): string {
  return filename.replace(/\.md$/i, '')
}

const markdownComponents: Components = {
  img: (props) => {
    const { node: _node, ...imgProps } = props
    const { src, alt, title } = imgProps

    if (title === LORE_IMAGE_TOKEN_TITLE && typeof src === 'string' && src.length > 0) {
      return (
        <Card
          variant="plain"
          sx={{
            p: 0,
            my: 4,
            overflow: 'hidden',
            borderRadius: 0,
            border: 'none',
            bgcolor: 'black',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: { xs: 3, sm: 4 },
            '--Card-padding': '0px',
            '&:hover, &:focus-within': {
              bgcolor: 'black',
              borderColor: 'transparent',
              boxShadow: 'none',
              outline: 'none',
            },
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10,
              boxShadow: 'inset 0 0 60px 30px #000',
              pointerEvents: 'none',
            }}
          />

          <Box
            component="img"
            src={src}
            alt=""
            loading="lazy"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(20px) brightness(0.55)',
              transform: 'scale(1.1)',
              zIndex: 0,
              opacity: 0.85,
              my: 0,
              border: 'none',
              background: 'none',
              animation: 'none',
            }}
          />

          <Box
            component="img"
            src={src}
            alt={typeof alt === 'string' ? alt : ''}
            loading="lazy"
            sx={{
              position: 'relative',
              zIndex: 1,
              objectFit: 'contain',
              width: '60%',
              maxWidth: '100%',
              height: 'auto',
              display: 'block',
              my: 0,
              border: 'none',
              background: 'none',
              animation: 'none',
            }}
          />
        </Card>
      )
    }

    return <img {...imgProps} />
  },
}

const proseSx = {
  fontSize: { xs: '1rem', sm: '1.125rem' },
  lineHeight: 1.8,
  color: 'text.secondary',
  '& h1, & h2, & h3, & h4, & h5, & h6': {
    color: 'primary.200',
    scrollMarginTop: '100px',
  },
  '& h1': {
    fontSize: { xs: '2rem', sm: '2.5rem' },
    fontWeight: 700,
    mt: 6,
    mb: 3,
  },
  '& h2': {
    fontSize: { xs: '1.6rem', sm: '2rem' },
    fontWeight: 700,
    mt: 5,
    mb: 2.5,
    pb: 1,
    borderBottom: '1px solid',
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  '& h3': {
    fontSize: { xs: '1.25rem', sm: '1.5rem' },
    fontWeight: 600,
    mt: 4,
    mb: 2,
    color: 'primary.300',
  },
  '& h4': {
    fontSize: { xs: '1.1rem', sm: '1.25rem' },
    fontWeight: 600,
    mt: 3,
    mb: 1.5,
  },
  '& p': {
    mb: 3,
  },
  '& strong': {
    color: 'text.primary',
    fontWeight: 600,
  },
  '& ul, & ol': {
    ml: { xs: 2, sm: 3 },
    mb: 3,
    pl: { xs: 0.5, sm: 1 },
    '& li': {
      mb: 1,
      pl: 1,
      '&::marker': {
        color: 'primary.400',
      },
    },
  },
  '& blockquote': {
    borderLeft: '4px solid',
    borderColor: 'primary.500',
    pl: 3,
    py: 2,
    my: 4,
    fontStyle: 'italic',
    bgcolor: 'rgba(139, 92, 246, 0.05)',
    color: 'text.primary',
  },
  '& code': {
    backgroundColor: 'rgba(20, 83, 45, 0.6)',
    color: '#4ade80',
    px: 0.75,
    py: 0.25,
    borderRadius: 0,
    fontSize: '0.9rem',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    border: '1px solid',
    borderColor: 'rgba(74, 222, 128, 0.2)',
    background: 'linear-gradient(to right, rgba(20, 83, 45, 0.6) 0%, rgba(74, 222, 128, 0.25) 50%, rgba(20, 83, 45, 0.6) 100%)',
    backgroundSize: '1000px 100%',
    animation: 'shimmer 6s linear infinite',
    '&:nth-of-type(2n)': { animationDuration: '4s' },
    '&:nth-of-type(3n)': { animationDuration: '8s' },
    '&:nth-of-type(5n)': { animationDuration: '5s' },
    '&:nth-of-type(7n)': { animationDuration: '7s' },
  },
  '& pre': {
    backgroundColor: '#282c34 !important',
    p: 2,
    borderRadius: 0,
    overflow: 'auto',
    my: 4,
    border: '1px solid',
    borderColor: 'rgba(255,255,255,0.1)',
    '& code': {
      backgroundColor: 'transparent !important',
      color: 'inherit',
      p: 0,
      border: 'none',
      fontFamily: 'inherit',
      background: 'none',
      animation: 'none',
    },
    '& .hljs': {
      background: 'transparent',
    },
  },
  '& a': {
    color: 'primary.400',
    textDecoration: 'none',
    borderBottom: '1px dashed',
    borderColor: 'primary.400',
    transition: 'all 0.2s',
    '&:hover': {
      color: 'primary.300',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      borderBottomStyle: 'solid',
    },
  },
  '& img': {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: 0,
    my: 4,
    display: 'block',
    border: '1px solid',
    borderColor: 'rgba(255,255,255,0.1)',
    background: 'linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0) 100%)',
    backgroundSize: '1000px 100%',
    animation: 'shimmer 15s linear infinite',
  },
  '& hr': {
    border: 'none',
    borderTop: '1px solid',
    borderColor: 'divider',
    my: 6,
  },
  '& table': {
    width: '100%',
    borderCollapse: 'collapse',
    my: 4,
    display: 'block',
    overflowX: 'auto',
  },
  '& th': {
    textAlign: 'left',
    p: 2,
    borderBottom: '2px solid',
    borderColor: 'primary.500',
    color: 'primary.100',
  },
  '& td': {
    p: 2,
    borderBottom: '1px solid',
    borderColor: 'divider',
  },
} as const

export default async function LoreGameFullStoryPage({
  params,
}: {
  params: Promise<{ game: string }>
}) {
  const { game } = await params
  const gameGroups = await loadLoreGameGroups()
  const group = gameGroups.find((candidate) => candidate.game.slug === game)

  if (!group) {
    notFound()
  }

  const povPosts = getLorePovPosts(group.posts, group.game.slug, group.game.fullStoryPov)
  const storyPosts = povPosts.length > 0 ? povPosts : sortLorePosts(group.posts, 'story_order_asc')
  const cover = group.game.coverImage ? transformPostImageUrl(group.game.coverImage) : null
  const povLabel = toSentenceCase(group.game.fullStoryPov.replace(/-/g, ' '))

  return (
    <Box
      component="article"
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', sm: '100%', md: '90%', lg: '80%' },
        mx: 'auto',
        px: { xs: 0, sm: 4 },
        py: { xs: 2.5, sm: 6 },
        '@keyframes shimmer': {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        ...AMBIENT_PULSE_KEYFRAMES,
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
          alignSelf: 'flex-start',
          minHeight: 44,
          width: { xs: '100%', sm: 'auto' },
          justifyContent: 'flex-start',
        }}
      >
        Back to lore
      </Button>

      <Box
        sx={{
          bgcolor: 'rgba(19, 10, 30, 0.4)',
          backdropFilter: 'blur(12px)',
          border: '1px solid',
          borderColor: 'rgba(255,255,255,0.08)',
          p: { xs: 1.5, md: 6 },
        }}
      >
        <Box component="header" sx={{ mb: 6 }}>
          <Typography
            level="h1"
            sx={{
              fontSize: { xs: '2rem', sm: '3rem', md: '3.5rem' },
              fontWeight: 800,
              mb: 2,
              lineHeight: 1.1,
              background: 'linear-gradient(to right, #fff, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {group.game.title}
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 2 }}>
            <Chip size="sm" variant="soft" color="primary" sx={{ borderRadius: 0 }}>
              POV: {povLabel}
            </Chip>
            <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
              {storyPosts.length} chapter{storyPosts.length === 1 ? '' : 's'}
            </Typography>
          </Stack>

          <Typography
            level="body-lg"
            sx={{
              color: 'text.secondary',
              fontSize: { xs: '1.05rem', sm: '1.2rem' },
              lineHeight: 1.6,
              mb: 4,
            }}
          >
            {group.game.summary}
          </Typography>

          {cover ? (
            <Box sx={{ mb: 4 }}>
              <AmbientCoverArt
                coverImageUrl={cover}
                alt={`${group.game.title} cover`}
              />
            </Box>
          ) : null}
        </Box>

        <Divider sx={{ mb: 6, bgcolor: 'rgba(255,255,255,0.1)' }} />

        <Stack spacing={0}>
          {storyPosts.map((post, index) => {
            const markdownContent = replaceLoreImageTokens(post.content)
            return (
              <Box key={post.filename} component="section" sx={{ minWidth: 0 }}>
                <Box sx={proseSx}>
                  {post.metadata.cover_image ? (
                    <Box sx={{ mb: 3 }}>
                      <AmbientCoverArt
                        coverImageUrl={transformPostImageUrl(post.metadata.cover_image)}
                        alt={post.metadata.title}
                      />
                    </Box>
                  ) : null}

                  <Typography
                    component="h2"
                    sx={{
                      fontSize: { xs: '1.6rem', sm: '2rem' },
                      fontWeight: 700,
                      mt: 0,
                      mb: 2.5,
                      pb: 1,
                      color: 'primary.200',
                      borderBottom: '1px solid',
                      borderColor: 'rgba(139, 92, 246, 0.2)',
                    }}
                  >
                    {post.metadata.title}
                  </Typography>

                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSanitize]}
                    components={markdownComponents}
                  >
                    {markdownContent}
                  </ReactMarkdown>
                </Box>

                <Button
                  component="a"
                  href={`/lore/${getSlugFromFilename(post.filename)}`}
                  variant="plain"
                  color="neutral"
                  sx={{
                    mt: 1,
                    minHeight: 44,
                    px: 0,
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    borderRadius: 0,
                    alignSelf: 'flex-start',
                  }}
                >
                  Open chapter
                </Button>

                {index < storyPosts.length - 1 && (
                  <Divider sx={{ my: 5, borderColor: 'rgba(255,255,255,0.08)' }} />
                )}
              </Box>
            )
          })}
        </Stack>
      </Box>
    </Box>
  )
}
