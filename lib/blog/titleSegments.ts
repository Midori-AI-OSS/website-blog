const NO_SPACE_BEFORE_TITLE_SEGMENT_REGEX = /^[,.;:!?%)\]}'’]/;
const NO_SPACE_AFTER_TITLE_SEGMENT_REGEX = /[([{/\-–—]$/;

export function shouldInsertSpaceBetweenTitleSegments(
  previousText: string | null | undefined,
  nextText: string,
): boolean {
  if (!previousText || !nextText) {
    return false;
  }

  if (NO_SPACE_BEFORE_TITLE_SEGMENT_REGEX.test(nextText)) {
    return false;
  }

  if (NO_SPACE_AFTER_TITLE_SEGMENT_REGEX.test(previousText)) {
    return false;
  }

  return true;
}

export function joinTitleSegments<T extends { text: string }>(segments: T[]): string {
  let title = '';
  let previousText: string | null = null;

  for (const segment of segments) {
    if (!segment.text) {
      continue;
    }

    if (shouldInsertSpaceBetweenTitleSegments(previousText, segment.text)) {
      title += ' ';
    }

    title += segment.text;
    previousText = segment.text;
  }

  return title.trim();
}
