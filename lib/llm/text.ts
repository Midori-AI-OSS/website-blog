import type { ParsedPost } from '@/lib/blog/parser';
import { extractIsoDateFromBlogFilename, normalizeIsoDateString } from '@/lib/content/publish';
import { toLoreImageApiUrl, transformPostImageUrl } from '@/lib/content/imageUrl';

export type LlmPostType = 'blog' | 'lore';

export interface LlmPostEntry {
  type: LlmPostType;
  slug: string;
  title: string;
  summary: string;
  canonicalPath: string;
  llmPath: string;
  sourcePath: string;
  publishDate: string;
}

export interface NormalizedMarkdown {
  plainText: string;
  imageUrls: string[];
}

const LORE_IMAGE_TOKEN_PATTERN = /\{\{\s*image\s*:\s*([^}]+?)\s*\}\}/gi;
const MARKDOWN_IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)/g;

function getSlugFromFilename(filename: string): string {
  return filename.replace(/\.md$/i, '');
}

function getCanonicalPath(type: LlmPostType, slug: string): string {
  return type === 'blog' ? `/blog/${slug}` : `/lore/${slug}`;
}

function getLlmPath(type: LlmPostType, slug: string): string {
  return type === 'blog' ? `/llm/blog/${slug}` : `/llm/lore/${slug}`;
}

function getSourcePath(type: LlmPostType, filename: string): string {
  return type === 'blog' ? `blog/posts/${filename}` : `lore/posts/${filename}`;
}

function getPostDate(type: LlmPostType, post: ParsedPost): string {
  if (type === 'blog') {
    return extractIsoDateFromBlogFilename(post.filename) ?? 'Unknown';
  }
  return normalizeIsoDateString(post.metadata.date) ?? 'Unknown';
}

function formatTitle(post: ParsedPost): string {
  const title = post.metadata.title?.trim();
  if (title) return title;
  return getSlugFromFilename(post.filename);
}

function formatSummary(post: ParsedPost): string {
  return post.metadata.summary?.trim() ?? '';
}

function toContentImageUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return trimmed;

  if (trimmed.startsWith('/blog/') || trimmed.startsWith('/lore/')) {
    return transformPostImageUrl(trimmed);
  }

  return trimmed;
}

function convertMarkdownToPlainText(markdown: string): string {
  let text = markdown.replace(/\r\n/g, '\n');

  // Keep code content while removing fence markers.
  text = text.replace(/```[^\n]*\n/g, '\n');
  text = text.replace(/```/g, '\n');

  // Remove common markdown formatting while preserving content.
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/^>\s?/gm, '');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/~~([^~]+)~~/g, '$1');

  // Normalize list bullets for readability.
  text = text.replace(/^\s*[-*+]\s+/gm, '- ');
  text = text.replace(/^\s*(\d+\.)\s+/gm, '$1 ');

  text = text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');

  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

export function normalizeMarkdownForLlm(markdown: string): NormalizedMarkdown {
  const expandedTokens = markdown.replace(LORE_IMAGE_TOKEN_PATTERN, (_fullMatch, tokenValue: string) => {
    const loreUrl = toLoreImageApiUrl(tokenValue);
    const imageUrl = loreUrl ?? toContentImageUrl(tokenValue);
    if (!imageUrl) return '';
    return `\n\n![Lore image](${imageUrl})\n\n`;
  });

  const imageUrls: string[] = [];
  const markdownWithImageLines = expandedTokens.replace(
    MARKDOWN_IMAGE_PATTERN,
    (_fullMatch, altText: string, rawUrl: string) => {
      const imageUrl = toContentImageUrl(rawUrl);
      if (imageUrl) {
        imageUrls.push(imageUrl);
      }

      const cleanedAlt = typeof altText === 'string' ? altText.trim() : '';
      const imageLabel = cleanedAlt ? `Image (${cleanedAlt})` : 'Image';
      return `\n\n${imageLabel}: ${imageUrl}\n\n`;
    }
  );

  const markdownWithLinkText = markdownWithImageLines.replace(
    MARKDOWN_LINK_PATTERN,
    (_fullMatch, label: string, rawUrl: string) => `${label.trim()} (${rawUrl.trim()})`
  );

  const plainText = convertMarkdownToPlainText(markdownWithLinkText);
  const uniqueImageUrls = Array.from(new Set(imageUrls));

  return {
    plainText,
    imageUrls: uniqueImageUrls,
  };
}

export function buildLlmPostEntries(type: LlmPostType, posts: ParsedPost[]): LlmPostEntry[] {
  return posts.map((post) => {
    const slug = getSlugFromFilename(post.filename);

    return {
      type,
      slug,
      title: formatTitle(post),
      summary: formatSummary(post),
      canonicalPath: getCanonicalPath(type, slug),
      llmPath: getLlmPath(type, slug),
      sourcePath: getSourcePath(type, post.filename),
      publishDate: getPostDate(type, post),
    };
  });
}

function renderEntryLine(entry: LlmPostEntry): string {
  const summarySuffix = entry.summary ? ` | summary: ${entry.summary}` : '';
  return `- ${entry.title} | site: ${entry.canonicalPath} | llm: ${entry.llmPath} | source: ${entry.sourcePath}${summarySuffix}`;
}

export function renderLlmIndexText(blogEntries: LlmPostEntry[], loreEntries: LlmPostEntry[]): string {
  const lines: string[] = [
    'Midori AI LLM Text Index',
    '',
    'Site Rundown',
    '- Home: /',
    '- Blog index: /blog',
    '- Lore index: /lore',
    '- LLM index: /llm',
    '',
    `Blog Posts (${blogEntries.length})`,
  ];

  for (const entry of blogEntries) {
    lines.push(renderEntryLine(entry));
  }

  lines.push('');
  lines.push(`Lore Posts (${loreEntries.length})`);

  for (const entry of loreEntries) {
    lines.push(renderEntryLine(entry));
  }

  lines.push('');
  lines.push('Per-post plain text mirrors live under /llm/blog/<slug> and /llm/lore/<slug>.');

  return lines.join('\n');
}

function formatMetadataLine(label: string, value: string | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  return `${label}: ${normalized}`;
}

export function renderLlmPostText(type: LlmPostType, post: ParsedPost): string {
  const slug = getSlugFromFilename(post.filename);
  const canonicalPath = getCanonicalPath(type, slug);
  const llmPath = getLlmPath(type, slug);
  const sourcePath = getSourcePath(type, post.filename);
  const publishDate = getPostDate(type, post);
  const tags = post.metadata.tags?.join(', ');
  const normalizedMarkdown = normalizeMarkdownForLlm(post.content);

  const imageUrls = [...normalizedMarkdown.imageUrls];
  const coverImage = post.metadata.cover_image?.trim();
  const transformedCoverImage = coverImage ? toContentImageUrl(coverImage) : null;
  if (transformedCoverImage && !imageUrls.includes(transformedCoverImage)) {
    imageUrls.unshift(transformedCoverImage);
  }

  const lines: string[] = [
    `Title: ${formatTitle(post)}`,
    `Type: ${type}`,
    `Canonical URL: ${canonicalPath}`,
    `LLM URL: ${llmPath}`,
    `Source Markdown: ${sourcePath}`,
    `Publish Date: ${publishDate}`,
  ];

  const summaryLine = formatMetadataLine('Summary', post.metadata.summary);
  if (summaryLine) lines.push(summaryLine);

  const authorLine = formatMetadataLine('Author', post.metadata.author);
  if (authorLine) lines.push(authorLine);

  if (tags?.trim()) {
    lines.push(`Tags: ${tags}`);
  }

  if (transformedCoverImage) {
    lines.push(`Cover Image: ${transformedCoverImage}`);
  }

  if (imageUrls.length > 0) {
    lines.push('');
    lines.push('Image Links:');
    imageUrls.forEach((url, index) => {
      lines.push(`${index + 1}. ${url}`);
    });
  }

  lines.push('');
  lines.push('Body:');
  lines.push(normalizedMarkdown.plainText || '(No body content)');

  return lines.join('\n');
}
