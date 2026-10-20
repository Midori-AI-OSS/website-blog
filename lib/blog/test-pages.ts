import type { TestPageDefinition } from '@/lib/content/test-page-registry';

export const blogTestPages: readonly TestPageDefinition[] = [
  {
    href: '/blog/test/markdown',
    title: 'Markdown and post layout',
    purpose: 'See how a Blog post presents headings, lists, links, images, tables, and dialogue.',
  },
  {
    href: '/blog/test/archive',
    title: 'Archive browsing',
    purpose:
      'Explore immediate month sections, jump navigation, deferred artwork, filters, and pagination.',
  },
  {
    href: '/blog/test/language-markup',
    title: 'Fictional language display',
    purpose: 'View Celestial and Abyssal text, including the hover reveal effect.',
  },
  {
    href: '/blog/test/tts',
    title: 'Text-to-speech audio',
    purpose: 'Generate and play a Blog reading with normal speech and fictional-language audio.',
  },
  {
    href: '/transition-test?returnTo=%2Fblog%2Ftest%2Fmarkdown',
    title: 'Page transitions',
    purpose: 'Compare fast and delayed page transitions from the Blog Markdown example.',
  },
];
