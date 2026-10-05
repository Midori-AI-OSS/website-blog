/**
 * Shared image URL transforms for blog/lore content.
 */

export const POST_COVER_PLACEHOLDER_IMAGE = '/blog/placeholder.png';
export const POST_COVER_PLACEHOLDER_IMAGE_URL = '/api/blog-images/placeholder.png';

export function transformPostImageUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url, 'http://local.invalid');
  } catch {
    return url;
  }
  if (parsed.origin !== 'http://local.invalid') return url;

  if (parsed.pathname.startsWith('/blog/')) {
    return `/api/blog-images/${parsed.pathname.slice('/blog/'.length)}${parsed.search}${parsed.hash}`;
  }

  if (parsed.pathname.startsWith('/lore/')) {
    const normalized = parsed.pathname
      .slice('/lore/'.length)
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')
      .trim();
    if (!normalized) return url;

    const segments = normalized.split('/').filter(Boolean);
    try {
      const encoded = segments
        .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
        .join('/');
      return `/api/lore-images/${encoded}${parsed.search}${parsed.hash}`;
    } catch {
      return url;
    }
  }

  return url;
}

export function resolvePostCoverImageUrl(url: string | null | undefined): string {
  const trimmed = typeof url === 'string' ? url.trim() : '';
  return trimmed ? transformPostImageUrl(trimmed) : POST_COVER_PLACEHOLDER_IMAGE_URL;
}

export function toLoreImageApiUrl(rawPath: string): string | null {
  const raw = rawPath.trim();
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw, 'http://local.invalid');
  } catch {
    return null;
  }
  if (parsed.origin !== 'http://local.invalid') return null;

  const lowerPath = parsed.pathname.toLowerCase();
  if (!lowerPath.startsWith('/lore/') && lowerPath !== '/lore') return null;

  const normalized = parsed.pathname
    .replace(/^\/+/, '')
    .slice('lore/'.length)
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .trim();
  if (!normalized) return null;

  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  let encoded: string;
  try {
    encoded = segments.map((segment) => encodeURIComponent(decodeURIComponent(segment))).join('/');
  } catch {
    return null;
  }
  return `/api/lore-images/${encoded}${parsed.search}${parsed.hash}`;
}
