/**
 * Client-side wrapper for BlogList component
 * Handles navigation to individual posts using Next.js router
 */

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BlogList } from '@/components/blog/BlogList';
import { TagFilterBar } from '@/components/TagFilterBar';
import type { ParsedPost } from '@/lib/blog/parser';

interface BlogPageClientProps {
  initialPosts: ParsedPost[];
  allPosts: ParsedPost[];
}

export function BlogPageClient({ initialPosts, allPosts }: BlogPageClientProps) {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Derive all unique tags from allPosts
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allPosts.forEach((post) => {
      post.metadata.tags?.forEach((tag) => {
        const trimmed = tag.trim();
        if (trimmed) {
          // Case-insensitive uniqueness: store in a normalized way
          const normalized = trimmed.toLowerCase();
          // Find if we already have this tag in a different case
          const existing = Array.from(tagSet).find(t => t.toLowerCase() === normalized);
          if (!existing) {
            tagSet.add(trimmed);
          }
        }
      });
    });
    // Sort alphabetically (case-insensitive)
    return Array.from(tagSet).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [allPosts]);
  
  // Filter posts based on selected tags
  const filteredAllPosts = useMemo(() => {
    if (selectedTags.length === 0) {
      return allPosts;
    }
    // Show posts that match ANY selected tag
    return allPosts.filter((post) => {
      const postTags = post.metadata.tags?.map(t => t.trim().toLowerCase()) || [];
      return selectedTags.some(selectedTag => 
        postTags.includes(selectedTag.toLowerCase())
      );
    });
  }, [allPosts, selectedTags]);
  
  // Compute filtered initial posts (first 10)
  const filteredInitialPosts = useMemo(() => {
    return filteredAllPosts.slice(0, 10);
  }, [filteredAllPosts]);
  
  const handlePostClick = (post: ParsedPost) => {
    // Extract slug from filename (remove .md extension)
    const slug = post.filename.replace('.md', '');
    // Navigate to the post page
    router.push(`/blog/${slug}`);
  };
  
  return (
    <>
      <TagFilterBar
        allTags={allTags}
        selectedTags={selectedTags}
        onChange={setSelectedTags}
      />
      <BlogList
        key={selectedTags.join(',')}
        initialPosts={filteredInitialPosts}
        allPosts={filteredAllPosts}
        onPostClick={handlePostClick}
      />
    </>
  );
}
