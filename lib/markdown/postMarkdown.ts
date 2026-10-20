import { toPostImageApiUrl } from '@/lib/content/imageUrl';

export const POST_IMAGE_TOKEN_TITLE = 'post-image-token';

export function replacePostImageTokens(markdown: string): string {
  return markdown.replace(
    /\{\{\s*image\s*:\s*([^}]+?)\s*\}\}/gi,
    (fullMatch, tokenValue: string) => {
      const url = toPostImageApiUrl(tokenValue);
      if (!url) return fullMatch;

      const raw = tokenValue.trim();
      const imagePath = raw.split(/[?#]/, 1)[0] ?? raw;
      const basename = imagePath.split('/').filter(Boolean).pop() ?? 'image';
      const alt =
        basename
          .replace(/\.[a-z0-9]+$/i, '')
          .replace(/[_-]+/g, ' ')
          .trim() || 'Post image';

      return `\n\n![${alt}](${url} "${POST_IMAGE_TOKEN_TITLE}")\n\n`;
    },
  );
}

export function normalizeThinkingTagFormatting(markdown: string): string {
  return markdown.replace(
    /<thinking>\s*\n((?:(?!\n\n)[\s\S])*?)\n\s*<\/thinking>/g,
    '<thinking>$1</thinking>',
  );
}

export function replaceFictionalLangTagTokens(markdown: string): string {
  return markdown
    .replace(/<celestial:R>/gi, '<celestial reveal>')
    .replace(/<abyssal:R>/gi, '<abyssal reveal>')
    .replace(/<\/celestial:R>/gi, '</celestial>')
    .replace(/<\/abyssal:R>/gi, '</abyssal>');
}

export function preparePostMarkdown(markdown: string): string {
  return replaceFictionalLangTagTokens(
    normalizeThinkingTagFormatting(replacePostImageTokens(markdown)),
  );
}
