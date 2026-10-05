export interface RadioImageInventory {
  images: string[];
  placeholder: string;
  count: number;
  generated_at: string;
}

export function createDeterministicHash(input: string): number {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function pickDeterministicImage(
  images: readonly string[],
  identityKey: string,
  placeholder: string,
): string {
  if (images.length === 0) {
    return placeholder;
  }

  const hash = createDeterministicHash(identityKey);
  const index = hash % images.length;
  return images[index] ?? placeholder;
}

export function appendTrackCacheKey(url: string, trackId: string | null | undefined): string {
  const normalizedTrackId = trackId?.trim();
  if (!normalizedTrackId) {
    return url;
  }

  const hashIndex = url.indexOf('#');
  const basePart = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hashPart = hashIndex === -1 ? '' : url.slice(hashIndex);

  const queryIndex = basePart.indexOf('?');
  const pathPart = queryIndex === -1 ? basePart : basePart.slice(0, queryIndex);
  const queryPart = queryIndex === -1 ? '' : basePart.slice(queryIndex + 1);

  const params = new URLSearchParams(queryPart);
  params.set('midoriai_track', normalizedTrackId);

  const nextQuery = params.toString();
  return nextQuery.length > 0 ? `${pathPart}?${nextQuery}${hashPart}` : `${pathPart}${hashPart}`;
}

interface ImageLoad {
  promise: Promise<boolean>;
  settled: boolean;
}

const imageLoads = new Map<string, ImageLoad>();
const MAX_CACHED_IMAGES = 64;

export function preloadImage(url: string, timeoutMs: number = 7000): Promise<boolean> {
  const key = url.trim();
  if (typeof window === 'undefined' || !key) return Promise.resolve(false);
  const existing = imageLoads.get(key);
  if (existing) {
    imageLoads.delete(key);
    imageLoads.set(key, existing);
    return existing.promise;
  }

  let resolveResult!: (success: boolean) => void;
  const promise = new Promise<boolean>((resolve) => {
    resolveResult = resolve;
  });
  const entry: ImageLoad = { promise, settled: false };
  imageLoads.set(key, entry);
  const image = new Image();
  const timeoutId = window.setTimeout(() => finalize(false), timeoutMs);

  function finalize(success: boolean) {
    if (entry.settled) return;
    entry.settled = true;
    window.clearTimeout(timeoutId);
    image.onload = null;
    image.onerror = null;
    if (!success) {
      imageLoads.delete(key);
      image.src = '';
    } else {
      let settledCount = [...imageLoads.values()].filter((load) => load.settled).length;
      for (const [cachedKey, load] of imageLoads) {
        if (settledCount <= MAX_CACHED_IMAGES) break;
        if (load.settled) {
          imageLoads.delete(cachedKey);
          settledCount--;
        }
      }
    }
    resolveResult(success);
  }

  image.onload = () => finalize(true);
  image.onerror = () => finalize(false);
  try {
    image.src = key;
  } catch {
    finalize(false);
  }
  return promise;
}
