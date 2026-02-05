'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { BlogList } from '@/components/blog/BlogList';
import { TagFilterBar } from '@/components/TagFilterBar';
import type { ParsedPost } from '@/lib/blog/parser';

interface LoreListPageClientProps {
  initialPosts: ParsedPost[];
  allPosts: ParsedPost[];
}

export function LoreListPageClient({ initialPosts, allPosts }: LoreListPageClientProps) {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handlePostClick = (post: ParsedPost) => {
    const slug = post.filename.replace('.md', '');
    router.push(`/lore/${slug}`);
  };

  // Derive all unique tags from all posts (case-insensitive uniqueness, sorted)
  const allTags = useMemo(() => {
    const tagMap = new Map<string, string>();
    
    allPosts.forEach(post => {
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
  }, [allPosts]);

  // Filter posts based on selected tags (match ANY selected tag)
  const filteredAllPosts = useMemo(() => {
    if (selectedTags.length === 0) {
      return allPosts;
    }
    
    const selectedLowerCase = selectedTags.map(tag => tag.toLowerCase());
    return allPosts.filter(post => {
      const postTags = (post.metadata.tags || []).map(tag => tag.toLowerCase());
      return selectedLowerCase.some(selectedTag => postTags.includes(selectedTag));
    });
  }, [allPosts, selectedTags]);

  // Compute initial posts from filtered set
  const filteredInitialPosts = useMemo(() => {
    return filteredAllPosts.slice(0, 10);
  }, [filteredAllPosts]);

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
