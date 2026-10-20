import { loadAllPosts } from '@/lib/blog/loader';
import { loadAllLorePosts } from '@/lib/lore/loader';
import { buildSharedImageOwnerDateIndex, type SharedImageOwnerDateIndex } from './imageCachePolicy';

const OWNER_INDEX_REFRESH_MS = 60 * 1000;

let cachedIndex: SharedImageOwnerDateIndex | null = null;
let cachedAt = 0;
let refreshInProgress: Promise<SharedImageOwnerDateIndex> | null = null;

export async function getSharedImageOwnerDateIndex(
  now: number = Date.now(),
): Promise<SharedImageOwnerDateIndex> {
  if (cachedIndex && now - cachedAt < OWNER_INDEX_REFRESH_MS) return cachedIndex;
  if (refreshInProgress) return refreshInProgress;

  refreshInProgress = Promise.all([
    loadAllPosts(undefined, { includeScheduled: true }),
    loadAllLorePosts({ includeScheduled: true }),
  ])
    .then(([blogPosts, lorePosts]) => {
      cachedIndex = buildSharedImageOwnerDateIndex(blogPosts, lorePosts);
      cachedAt = Date.now();
      return cachedIndex;
    })
    .finally(() => {
      refreshInProgress = null;
    });

  return refreshInProgress;
}

export function clearSharedImageOwnerDateIndexForTests(): void {
  cachedIndex = null;
  cachedAt = 0;
  refreshInProgress = null;
}
