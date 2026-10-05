import { loadAllLorePosts, loadLoreGameIndexes } from '@/lib/lore/loader';
import { buildLoreImageReferenceIndex, type LoreImageReferenceIndex } from './imageCachePolicy';

const REFERENCE_INDEX_REFRESH_MS = 60 * 1000;

let cachedIndex: LoreImageReferenceIndex | null = null;
let cachedAt = 0;
let refreshInProgress: Promise<LoreImageReferenceIndex> | null = null;

export async function getLoreImageReferenceIndex(
  now: number = Date.now(),
): Promise<LoreImageReferenceIndex> {
  if (cachedIndex && now - cachedAt < REFERENCE_INDEX_REFRESH_MS) return cachedIndex;
  if (refreshInProgress) return refreshInProgress;

  refreshInProgress = Promise.all([
    loadAllLorePosts({ includeScheduled: true }),
    loadLoreGameIndexes(),
  ])
    .then(([posts, games]) => {
      cachedIndex = buildLoreImageReferenceIndex(posts, games);
      cachedAt = Date.now();
      return cachedIndex;
    })
    .finally(() => {
      refreshInProgress = null;
    });

  return refreshInProgress;
}

export function clearLoreImageReferenceIndexForTests(): void {
  cachedIndex = null;
  cachedAt = 0;
  refreshInProgress = null;
}
