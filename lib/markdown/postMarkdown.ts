import { toLoreImageApiUrl } from '@/lib/content/imageUrl';

export const LORE_IMAGE_TOKEN_TITLE = 'lore-token';

export function replaceLoreImageTokens(markdown: string): string {
  return markdown.replace(
    /\{\{\s*image\s*:\s*([^}]+?)\s*\}\}/gi,
    (fullMatch, tokenValue: string) => {
      const url = toLoreImageApiUrl(tokenValue);
      if (!url) return fullMatch;

      const raw = tokenValue.trim();
      const basename = raw.split('/').filter(Boolean).pop() ?? 'image';
      const alt =
        basename
          .replace(/\.[a-z0-9]+$/i, '')
          .replace(/[_-]+/g, ' ')
          .trim() || 'Lore image';

      return `\n\n![${alt}](${url} "${LORE_IMAGE_TOKEN_TITLE}")\n\n`;
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
    normalizeThinkingTagFormatting(replaceLoreImageTokens(markdown)),
  );
}
