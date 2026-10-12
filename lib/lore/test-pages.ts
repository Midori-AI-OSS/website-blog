import type { TestPageDefinition } from '@/lib/content/test-page-registry';

export const loreTestPages: readonly TestPageDefinition[] = [
  {
    href: '/lore/test/markdown',
    title: 'Markdown and story layout',
    purpose: 'See how a Lore story presents prose, metadata, dialogue, and standard Markdown.',
  },
  {
    href: '/lore/test/game-ordering',
    title: 'Game ordering',
    purpose: 'Explore how weighted, dated, and empty games are arranged in the Lore list.',
  },
  {
    href: '/lore/test/lore-tokens',
    title: 'Lore image and species card tokens',
    purpose: 'View embedded Lore images and species care cards inside a story.',
  },
  {
    href: '/lore/test/language-markup',
    title: 'Fictional language display',
    purpose: 'View Celestial and Abyssal text, including the hover reveal effect.',
  },
  {
    href: '/lore/test/tts',
    title: 'Text-to-speech audio',
    purpose: 'Generate and play a Lore reading with normal speech and fictional-language audio.',
  },
  {
    href: '/lore/test/password-gate',
    title: 'Password-gated story',
    purpose: 'Try the password form and see how a protected Lore story opens.',
  },
  {
    href: '/transition-test?returnTo=%2Flore%2Ftest%2Fmarkdown',
    title: 'Page transitions',
    purpose: 'Compare fast and delayed page transitions from the Lore Markdown example.',
  },
];
