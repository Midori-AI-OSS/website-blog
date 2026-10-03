export function getPageRouteKey(url: URL): string {
  const search = url.searchParams.toString();
  return `${url.pathname}${search ? `?${search}` : ''}`;
}

export function getInternalPageTransitionHref(href: string, currentHref: string): string | null {
  try {
    const current = new URL(currentHref);
    const destination = new URL(href, current);

    if (
      destination.origin !== current.origin ||
      (destination.protocol !== 'http:' && destination.protocol !== 'https:') ||
      getPageRouteKey(destination) === getPageRouteKey(current)
    ) {
      return null;
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return null;
  }
}
