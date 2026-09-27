export const DEFAULT_SITE_API_ORIGIN = 'http://127.0.0.1:3000';

/** Returns the absolute origin used for server-side calls to this site's API. */
export function getSiteApiOrigin(): string {
  const configuredOrigin = process.env.SITE_API_ORIGIN?.trim();
  const value = configuredOrigin || DEFAULT_SITE_API_ORIGIN;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('SITE_API_ORIGIN must be an absolute HTTP(S) origin');
  }

  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.pathname !== '/' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new Error('SITE_API_ORIGIN must be an absolute HTTP(S) origin');
  }

  return url.origin;
}
