/**
 * Shared image URL transforms for blog/lore content.
 */

export function transformPostImageUrl(url: string): string {
  if (url.startsWith('/blog/')) {
    return url.replace('/blog/', '/api/blog-images/');
  }

  if (url.startsWith('/lore/')) {
    const withoutLeadingSlashes = url.replace(/^\/+/, '');
    const withoutLorePrefix = withoutLeadingSlashes.slice('lore/'.length);
    const normalized = withoutLorePrefix.replace(/^\/+/, '').replace(/\/+$/, '').trim();
    if (!normalized) return url;

    const segments = normalized.split('/').filter(Boolean);
    const encoded = segments.map((segment) => encodeURIComponent(segment)).join('/');
    return `/api/lore-images/${encoded}`;
  }

  return url;
}

export function toLoreImageApiUrl(rawPath: string): string | null {
  const raw = rawPath.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const hasLorePrefix = lower.startsWith('/lore/') || lower === '/lore';
  if (!hasLorePrefix) return null;

  const withoutLeadingSlashes = raw.replace(/^\/+/, '');
  const withoutLorePrefix = withoutLeadingSlashes.slice('lore/'.length);
  const normalized = withoutLorePrefix.replace(/^\/+/, '').replace(/\/+$/, '').trim();
  if (!normalized) return null;

  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const encoded = segments.map((segment) => encodeURIComponent(segment)).join('/');
  return `/api/lore-images/${encoded}`;
}
