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

function renderPostContent(content: string): string {
  return renderToStaticMarkup(
    <PostView
      post={{
        ...mockPost,
        filename: '2026-04-27.md',
        content,
        rawMarkdown: content,
      }}
      onClose={() => {}}
    />
  );
}

function countDialogueSpans(html: string): number {
  return (html.match(/<span data-dialogue="true"/g) ?? []).length;
}

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

  test('renders lore navigation affordances when next/previous stories are provided', () => {
    const html = renderToStaticMarkup(
      <PostView
        post={mockPost}
        onClose={() => {}}
        postType="lore"
        previousStory={{
          href: '/lore/older',
          title: 'Past Chapter',
          summary: 'A prior moment.',
        }}
        nextStory={{
          href: '/lore/newer',
          title: 'Next Chapter',
          summary: 'A future moment.',
        }}
      />
    );

    expect(html).toContain('Go back to past story');
    expect(html).toContain('Go to next story');
  });

  test('styles balanced dialogue in prose', () => {
    const html = renderPostContent('She said "Hello there." and waved.');

    expect(countDialogueSpans(html)).toBe(1);
    expect(html).toContain('data-dialogue="true"');
  });

  test('keeps markdown formatting inside dialogue spans', () => {
    const html = renderPostContent('She said "**hi** [there](https://example.com)."');

    expect(countDialogueSpans(html)).toBe(1);
    expect(html).toContain('<strong>hi</strong>');
    expect(html).toContain('<a href="https://example.com">there</a>');
  });

  test('does not style dialogue inside blockquotes', () => {
    const html = renderPostContent('> "Do not style this."\n\n"Style this."');

    expect(countDialogueSpans(html)).toBe(1);
    expect(html).toContain('<blockquote>');
    expect(html).toContain('Do not style this.');
    expect(html).toContain('Style this.');
  });

  test('leaves unmatched quotes as plain text', () => {
    const html = renderPostContent('She said "unfinished and moved on.');

    expect(countDialogueSpans(html)).toBe(0);
    expect(html).toContain('&quot;unfinished and moved on.');
  });

  test('normalizes curly double quotes in prose', () => {
    const html = renderPostContent('He said “Hello there.”');

    expect(countDialogueSpans(html)).toBe(1);
    expect(html).not.toContain('“');
    expect(html).not.toContain('”');
  });

  test('normalizes em dashes in prose', () => {
    const html = renderPostContent('Quiet progress — steady results.');

    expect(html).toContain('Quiet progress - steady results.');
    expect(html).not.toContain('Quiet progress — steady results.');
  });

  test('does not normalize em dashes inside inline code', () => {
    const html = renderPostContent('Use `a—b` as the token.');

    expect(html).toContain('<code>a—b</code>');
  });
});
