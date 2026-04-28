import { notFound } from 'next/navigation'
import { Box, Button } from '@mui/joy'
import { ArrowLeft } from 'lucide-react'

import { loadLoreGameGroups, getLorePovPosts, sortLorePosts } from '@/lib/lore/loader'
import { FullStoryClient } from './FullStoryClient'

export const dynamic = 'force-dynamic'

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
          alignSelf: 'flex-start',
          minHeight: 44,
          width: { xs: '100%', sm: 'auto' },
          justifyContent: 'flex-start',
        }}
      >
        Back to lore
      </Button>

      <FullStoryClient posts={storyPosts} />
    </Box>
  )
}
