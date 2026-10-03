export function getInternalPageTransitionHref(href: string, currentHref: string): string | null {
  try {
    const current = new URL(currentHref);
    const destination = new URL(href, current);

    if (
      destination.origin !== current.origin ||
      (destination.protocol !== 'http:' && destination.protocol !== 'https:') ||
      destination.pathname === current.pathname
    ) {
      return null;
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return null;
  }
}
