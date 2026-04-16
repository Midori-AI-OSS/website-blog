import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { PostView } from './PostView';

const mockPost = {
  filename: '2099-12-31.md',
  metadata: {
    title: 'Future Dispatch',
    summary: 'A scheduled update.',
    tags: ['future'],
    author: 'Becca Kay',
    cover_image: '/blog/placeholder.png',
  },
  content: '# Hidden Body\n\nThis should stay hidden before publish day.',
  rawMarkdown: '# Hidden Body\n\nThis should stay hidden before publish day.',
};

describe('PostView', () => {
  test('scheduled preview hides markdown content and shows teaser copy', () => {
    const html = renderToStaticMarkup(
      <PostView
        post={mockPost}
        onClose={() => {}}
        isScheduledPreview
        scheduledPublishDate="2099-12-31"
      />
    );

    expect(html).toContain('Scheduled for December 31, 2099');
    expect(html).toContain('This post is already queued in the site');
    expect(html).not.toContain('This should stay hidden before publish day.');
  });
});
