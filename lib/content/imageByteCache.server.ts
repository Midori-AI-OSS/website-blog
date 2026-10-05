export const IMAGE_BYTE_CACHE_MAX_TTL_MS = 5 * 24 * 60 * 60 * 1000;
export const IMAGE_BYTE_CACHE_MAX_BYTES = 256 * 1024 * 1024;

export interface ImageByteCacheEntry {
  data: Buffer;
  contentType: string;
  expiresAt: number;
}

export class ImageByteCache {
  private readonly entries = new Map<string, ImageByteCacheEntry>();
  private byteSize = 0;

  get sizeBytes(): number {
    return this.byteSize;
  }

  get(key: string, now: number = Date.now()): ImageByteCacheEntry | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= now) {
      this.delete(key);
      return null;
    }

    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry;
  }

  set(
    key: string,
    value: Omit<ImageByteCacheEntry, 'expiresAt'>,
    ttlSeconds: number,
    now: number = Date.now(),
  ): void {
    this.delete(key);
    if (value.data.byteLength > IMAGE_BYTE_CACHE_MAX_BYTES) return;

    const entry: ImageByteCacheEntry = {
      ...value,
      expiresAt: now + Math.min(ttlSeconds * 1000, IMAGE_BYTE_CACHE_MAX_TTL_MS),
    };
    while (
      this.byteSize + entry.data.byteLength > IMAGE_BYTE_CACHE_MAX_BYTES &&
      this.entries.size > 0
    ) {
      const oldestKey = this.entries.keys().next().value as string | undefined;
      if (!oldestKey) break;
      this.delete(oldestKey);
    }

    this.entries.set(key, entry);
    this.byteSize += entry.data.byteLength;
  }

  clear(): void {
    this.entries.clear();
    this.byteSize = 0;
  }

  private delete(key: string): void {
    const existing = this.entries.get(key);
    if (!existing) return;
    this.byteSize -= existing.data.byteLength;
    this.entries.delete(key);
  }
}

export const imageByteCache = new ImageByteCache();

export function getImageResponseCacheControl(ttlSeconds: number, fingerprinted: boolean): string {
  const immutable = fingerprinted ? ', immutable' : '';
  return `public, max-age=${Math.max(0, Math.floor(ttlSeconds))}${immutable}`;
}
