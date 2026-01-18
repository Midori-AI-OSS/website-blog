/**
 * Markdown Parser Utility
 * Parses blog posts with front matter metadata and markdown content
 */

import matter from 'gray-matter';

/**
 * Post metadata structure extracted from front matter
 */
export interface PostMetadata {
  title: string;
  summary?: string;
  tags?: string[];
  cover_image?: string;
  date?: string;
  author?: string;
}

/**
 * Parsed post data structure
 */
export interface ParsedPost {
  metadata: PostMetadata;
  content: string;        // Raw markdown content (to be rendered by react-markdown)
  rawMarkdown: string;    // Same as content (kept for compatibility)
  filename: string;
}

/**
 * Configuration for gray-matter parser
 * Default delimiter is '---', can be customized to '+++'
 */
const PARSER_CONFIG = {
  delimiters: '---' as const, // Change to '+++' if needed
};

/**
 * Extract title from filename (YYYY-MM-DD.md format)
 * @param filename - The markdown filename
 * @returns Formatted title string
 */
function extractTitleFromFilename(filename: string): string {
  // Extract date from YYYY-MM-DD.md format
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return `Post from ${match[1]}`;
  }
  
  // If no date pattern, use filename without extension
  const nameWithoutExt = filename.replace(/\.mdx?$/, '');
  return nameWithoutExt
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Untitled Post';
}

/**
 * Validate metadata structure
 * @param data - Raw metadata object from front matter
 * @returns true if metadata is valid
 */
function validateMetadata(data: any): boolean {
  // Tags must be an array if present
  if (data.tags !== undefined && !Array.isArray(data.tags)) {
    console.warn('Invalid tags format: expected array');
    return false;
  }
  
  // Cover image must be a string if present
  if (data.cover_image !== undefined && typeof data.cover_image !== 'string') {
    console.warn('Invalid cover_image format: expected string');
    return false;
  }
  
  // Title must be a string if present
  if (data.title !== undefined && typeof data.title !== 'string') {
    console.warn('Invalid title format: expected string');
    return false;
  }
  
  // Summary must be a string if present
  if (data.summary !== undefined && typeof data.summary !== 'string') {
    console.warn('Invalid summary format: expected string');
    return false;
  }
  
  return true;
}

/**
 * Sanitize and normalize metadata values
 * @param data - Raw metadata object
 * @returns Sanitized metadata
 */
function sanitizeMetadata(data: any): Partial<PostMetadata> {
  const sanitized: Partial<PostMetadata> = {};
  
  if (typeof data.title === 'string') {
    sanitized.title = data.title.trim();
  }
  
  if (typeof data.summary === 'string') {
    sanitized.summary = data.summary.trim();
  }
  
  if (Array.isArray(data.tags)) {
    sanitized.tags = data.tags
      .filter((tag: unknown): tag is string => typeof tag === 'string')
      .map((tag: string) => tag.trim())
      .filter((tag: string) => tag.length > 0);
  }
  
  if (typeof data.cover_image === 'string') {
    sanitized.cover_image = data.cover_image.trim();
  }
  
  if (typeof data.date === 'string') {
    sanitized.date = data.date.trim();
  }
  
  if (typeof data.author === 'string') {
    sanitized.author = data.author.trim();
  }
  
  return sanitized;
}

/**
 * Parse a markdown blog post with front matter
 * 
 * @param filename - The filename of the post (e.g., "2026-01-17.md")
 * @param fileContent - The raw content of the markdown file
 * @returns Parsed post data with metadata and content
 * 
 * @example
 * ```typescript
 * const content = `---
 * title: Hello World
 * summary: My first post
 * tags: [welcome, intro]
 * ---
 * 
 * # Content here`;
 * 
 * const post = parsePost('2026-01-17.md', content);
 * console.log(post.metadata.title); // "Hello World"
 * ```
 */
export function parsePost(filename: string, fileContent: string): ParsedPost {
  try {
    // Validate inputs
    if (!filename || typeof filename !== 'string') {
      throw new Error('Invalid filename');
    }
    
    if (!fileContent || typeof fileContent !== 'string') {
      throw new Error('Invalid file content');
    }
    
    // Parse front matter
    // Note: gray-matter automatically handles both --- and +++ delimiters
    const { data, content } = matter(fileContent, {
      // Uncomment to force specific delimiter:
      // delimiters: PARSER_CONFIG.delimiters
    });
    
    // Validate metadata structure
    if (!validateMetadata(data)) {
      console.warn(`Metadata validation failed for ${filename}, using defaults`);
    }
    
    // Sanitize and extract metadata with defaults
    const sanitizedData = sanitizeMetadata(data);
    const metadata: PostMetadata = {
      title: sanitizedData.title || extractTitleFromFilename(filename),
      summary: sanitizedData.summary,
      tags: sanitizedData.tags || [],
      cover_image: sanitizedData.cover_image,
      date: sanitizedData.date,
      author: sanitizedData.author,
    };
    
    // Return structured post data
    // Note: Content is raw markdown, sanitization happens at render time with rehype-sanitize
    return {
      metadata,
      content: content.trim(),
      rawMarkdown: content.trim(),
      filename,
    };
  } catch (error) {
    // Error handling: return safe defaults instead of crashing
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error parsing ${filename}:`, errorMessage);
    
    return {
      metadata: {
        title: extractTitleFromFilename(filename),
        tags: [],
      },
      content: '',
      rawMarkdown: '',
      filename,
    };
  }
}

/**
 * Parse multiple posts
 * @param posts - Array of {filename, content} objects
 * @returns Array of parsed posts
 */
export function parsePosts(posts: Array<{ filename: string; content: string }>): ParsedPost[] {
  return posts.map(({ filename, content }) => parsePost(filename, content));
}

/**
 * Extract only metadata from a post (without parsing full content)
 * Useful for listing posts without loading full content
 */
export function extractMetadata(filename: string, fileContent: string): PostMetadata {
  try {
    const { data } = matter(fileContent);
    
    if (!validateMetadata(data)) {
      console.warn(`Metadata validation failed for ${filename}`);
    }
    
    const sanitizedData = sanitizeMetadata(data);
    return {
      title: sanitizedData.title || extractTitleFromFilename(filename),
      summary: sanitizedData.summary,
      tags: sanitizedData.tags || [],
      cover_image: sanitizedData.cover_image,
      date: sanitizedData.date,
      author: sanitizedData.author,
    };
  } catch (error) {
    console.error(`Error extracting metadata from ${filename}:`, error);
    return {
      title: extractTitleFromFilename(filename),
      tags: [],
    };
  }
}
