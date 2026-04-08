'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { BlogList } from '@/components/blog/BlogList';
import { TagFilterBar } from '@/components/TagFilterBar';
import type { ParsedPost } from '@/lib/blog/parser';

const LORE_TAG = 'lore';

function isLoreTag(tag: string): boolean {
  return tag.trim().toLowerCase() === LORE_TAG;
}

function stripLoreTagFromPost(post: ParsedPost): ParsedPost {
  const tags = post.metadata.tags ?? [];
  const filteredTags = tags.filter((tag) => !isLoreTag(tag));

  if (filteredTags.length === tags.length) {
    return post;
  }

  return {
    ...post,
    metadata: {
      ...post.metadata,
      tags: filteredTags,
    },
  };
}

interface LoreListPageClientProps {
  initialPosts: ParsedPost[];
  allPosts: ParsedPost[];
}

export function LoreListPageClient({ initialPosts, allPosts }: LoreListPageClientProps) {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const visibleInitialPosts = useMemo(
    () => initialPosts.map(stripLoreTagFromPost),
    [initialPosts]
  );

  const visibleAllPosts = useMemo(
    () => allPosts.map(stripLoreTagFromPost),
    [allPosts]
  );

  const handlePostClick = (post: ParsedPost) => {
    const slug = post.filename.replace('.md', '');
    router.push(`/lore/${slug}`);
  };

  // Derive all unique tags from all posts (case-insensitive uniqueness, sorted)
  const allTags = useMemo(() => {
    const tagMap = new Map<string, string>();
    
    visibleAllPosts.forEach(post => {
      const tags = post.metadata.tags || [];
      tags.forEach(tag => {
        const trimmed = tag.trim();
        if (trimmed) {
          const lowerCase = trimmed.toLowerCase();
          if (!tagMap.has(lowerCase)) {
            tagMap.set(lowerCase, trimmed);
          }
        }
      });
    });
    
    return Array.from(tagMap.values()).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [visibleAllPosts]);

  // Filter posts based on selected tags (match ANY selected tag)
  const filteredAllPosts = useMemo(() => {
    if (selectedTags.length === 0) {
      return visibleAllPosts;
    }
    
    const selectedLowerCase = selectedTags.map(tag => tag.toLowerCase());
    return visibleAllPosts.filter(post => {
      const postTags = (post.metadata.tags || []).map(tag => tag.toLowerCase());
      return selectedLowerCase.some(selectedTag => postTags.includes(selectedTag));
    });
  }, [selectedTags, visibleAllPosts]);

  // Compute initial posts from filtered set
  const filteredInitialPosts = useMemo(() => {
    if (selectedTags.length === 0) {
      return visibleInitialPosts;
    }

    return filteredAllPosts.slice(0, 10);
  }, [filteredAllPosts, selectedTags, visibleInitialPosts]);

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
