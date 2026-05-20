export interface SpeciesCareTokenRef {
  raw: string;
  key: string;
  slug: string;
  version?: string;
}

export interface MarkdownSpeciesCarePart {
  id: string;
  type: 'markdown' | 'species-card';
  content?: string;
  token?: SpeciesCareTokenRef;
}

const SPECIES_CARD_TOKEN_REGEX = /\{\{\s*speciescard\s*:\s*([^}]+?)\s*\}\}/gi;

export function isValidSpeciesCareSlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/i.test(value);
}

export function isValidSpeciesCareVersion(value: string): boolean {
  return /^[a-z0-9][a-z0-9.-]*$/i.test(value);
}

export function makeSpeciesCareTokenKey(slug: string, version?: string): string {
  return version ? `lore/${slug}?version=${version}` : `lore/${slug}`;
}

export function parseSpeciesCareTokenValue(value: string): SpeciesCareTokenRef | null {
  const raw = value.trim();
  const withoutLeadingSlash = raw.replace(/^\/+/, '');
  if (!withoutLeadingSlash.toLowerCase().startsWith('lore/')) return null;

  const afterPrefix = withoutLeadingSlash.slice('lore/'.length);
  const [slugPart, queryPart] = afterPrefix.split('?', 2);
  const slug = slugPart?.trim().toLowerCase() ?? '';
  if (!isValidSpeciesCareSlug(slug)) return null;

  let version: string | undefined;
  if (queryPart) {
    const params = new URLSearchParams(queryPart);
    const queryVersion = params.get('version')?.trim().toLowerCase();
    if (queryVersion) {
      if (!isValidSpeciesCareVersion(queryVersion)) return null;
      version = queryVersion;
    }
  }

  return {
    raw,
    key: makeSpeciesCareTokenKey(slug, version),
    slug,
    version,
  };
}

export function extractSpeciesCareTokenRefs(markdown: string): SpeciesCareTokenRef[] {
  const refs = new Map<string, SpeciesCareTokenRef>();
  for (const match of markdown.matchAll(SPECIES_CARD_TOKEN_REGEX)) {
    const tokenValue = match[1];
    if (!tokenValue) continue;
    const token = parseSpeciesCareTokenValue(tokenValue);
    if (token) refs.set(token.key, token);
  }
  return Array.from(refs.values());
}

export function splitMarkdownSpeciesCareTokens(markdown: string): MarkdownSpeciesCarePart[] {
  const parts: MarkdownSpeciesCarePart[] = [];
  let lastIndex = 0;

  for (const match of markdown.matchAll(SPECIES_CARD_TOKEN_REGEX)) {
    const fullMatch = match[0];
    const tokenValue = match[1];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push({
        id: `markdown:${lastIndex}:${index}`,
        type: 'markdown',
        content: markdown.slice(lastIndex, index),
      });
    }

    const token = tokenValue ? parseSpeciesCareTokenValue(tokenValue) : null;
    if (token) {
      parts.push({ id: `species-card:${index}:${token.key}`, type: 'species-card', token });
    } else {
      parts.push({ id: `markdown-token:${index}`, type: 'markdown', content: fullMatch });
    }

    lastIndex = index + fullMatch.length;
  }

  if (lastIndex < markdown.length) {
    parts.push({
      id: `markdown:${lastIndex}:${markdown.length}`,
      type: 'markdown',
      content: markdown.slice(lastIndex),
    });
  }

  return parts.length > 0 ? parts : [{ id: 'markdown:all', type: 'markdown', content: markdown }];
}
