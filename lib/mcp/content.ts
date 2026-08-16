import { timingSafeEqual } from 'node:crypto';

import { getPostBySlug, loadAllPosts } from '@/lib/blog/loader';
import type { ParsedPost } from '@/lib/blog/parser';
import { transformPostImageUrl } from '@/lib/content/imageUrl';
import { extractIsoDateFromBlogFilename, normalizeIsoDateString } from '@/lib/content/publish';
import { normalizeMarkdownForLlm, renderLlmPostText } from '@/lib/llm/text';
import { getLorePostBySlug, loadAllLorePosts } from '@/lib/lore/loader';

export type McpPostType = 'blog' | 'lore';

export interface McpPostMetadata {
  type: McpPostType;
  slug: string;
  title: string;
  summary: string;
  publish_date: string;
  tags: string[];
  canonical_url: string;
  cover_image_url?: string;
  game?: string;
  story_order?: number;
  episode_label?: string;
}

export interface McpPostResult {
  found: boolean;
  access: 'granted' | 'password_required' | 'not_found';
  post?: McpPostMetadata;
  content?: string;
  password_hint?: string;
}

const SITE_URL = 'https://blog.midori-ai.xyz';

function getSlug(post: ParsedPost): string {
  return post.filename.replace(/\.md$/i, '');
}

function hasPassword(post: ParsedPost): boolean {
  return post.metadata.password !== undefined;
}

function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

function getCoverImageUrl(post: ParsedPost): string | undefined {
  const coverImage = post.metadata.cover_image?.trim();
  if (!coverImage) return undefined;
  return absoluteUrl(transformPostImageUrl(coverImage));
}

function getPublishDate(type: McpPostType, post: ParsedPost): string {
  if (type === 'blog') {
    return extractIsoDateFromBlogFilename(post.filename) ?? 'Unknown';
  }

  return normalizeIsoDateString(post.metadata.date) ?? 'Unknown';
}

export function toMcpPostMetadata(type: McpPostType, post: ParsedPost): McpPostMetadata {
  const slug = getSlug(post);

  return {
    type,
    slug,
    title: post.metadata.title,
    summary: post.metadata.summary ?? '',
    publish_date: getPublishDate(type, post),
    tags: post.metadata.tags ?? [],
    canonical_url: absoluteUrl(`/${type}/${slug}`),
    cover_image_url: getCoverImageUrl(post),
    game: post.metadata.game,
    story_order: post.metadata.story_order,
    episode_label: post.metadata.episode_label,
  };
}

function clampLimit(limit: number | undefined): number {
  return Math.min(Math.max(limit ?? 5, 1), 30);
}

function matchesSearch(post: ParsedPost, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return false;

  const searchableText = [
    post.metadata.title,
    post.metadata.summary,
    ...(post.metadata.tags ?? []),
    post.metadata.game,
    post.metadata.episode_label,
    normalizeMarkdownForLlm(post.content).plainText,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join('\n')
    .toLowerCase();

  return searchableText.includes(needle);
}

async function loadPosts(type: McpPostType): Promise<ParsedPost[]> {
  return type === 'blog' ? loadAllPosts() : loadAllLorePosts();
}

export async function listMcpPosts(type: McpPostType, limit?: number): Promise<McpPostMetadata[]> {
  const posts = await loadPosts(type);
  return posts
    .filter((post) => !hasPassword(post))
    .slice(0, clampLimit(limit))
    .map((post) => toMcpPostMetadata(type, post));
}

export async function searchMcpPosts(
  type: McpPostType,
  query: string,
  limit?: number,
): Promise<McpPostMetadata[]> {
  const posts = await loadPosts(type);
  return posts
    .filter((post) => !hasPassword(post) && matchesSearch(post, query))
    .slice(0, clampLimit(limit))
    .map((post) => toMcpPostMetadata(type, post));
}

function passwordsMatch(expected: string, supplied: string | undefined): boolean {
  if (supplied === undefined) return false;

  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

export async function getMcpPost(
  type: McpPostType,
  slug: string,
  password?: string,
): Promise<McpPostResult> {
  const posts = await loadPosts(type);
  const post = type === 'blog' ? getPostBySlug(posts, slug) : getLorePostBySlug(posts, slug);

  if (!post) {
    return { found: false, access: 'not_found' };
  }

  const metadata = toMcpPostMetadata(type, post);
  if (hasPassword(post) && !passwordsMatch(post.metadata.password ?? '', password)) {
    return {
      found: true,
      access: 'password_required',
      post: metadata,
      password_hint: post.metadata.password_hint,
    };
  }

  return {
    found: true,
    access: 'granted',
    post: metadata,
    content: renderLlmPostText(type, post),
  };
}
