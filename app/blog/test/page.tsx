import { TestPageIndex } from '@/components/test/TestPageIndex';
import { blogTestPages } from '@/lib/blog/test-pages';
import { createTestPageMetadata } from '@/lib/content/test-page-metadata';

export const dynamic = 'force-dynamic';

export const metadata = createTestPageMetadata(
  'Blog test pages',
  'Explore examples of the parts of Blog posts that readers see, from Markdown and archive browsing to language display and audio.',
);

export default function BlogTestIndexPage() {
  return (
    <TestPageIndex
      title="Blog test pages"
      description="Explore examples of the parts of Blog posts that readers see, from Markdown and archive browsing to language display and audio. Choose a topic below to open its own page."
      pages={blogTestPages}
    />
  );
}
