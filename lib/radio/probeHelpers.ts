export function extractLyricsEng(rawTags: Record<string, unknown> | null): string | null {
  if (rawTags === null) {
    return null;
  }

  const key = Object.keys(rawTags).find(
    (candidateKey) => candidateKey.toLowerCase() === 'lyrics-eng',
  );

  if (!key) {
    return null;
  }

  const value = rawTags[key];
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
