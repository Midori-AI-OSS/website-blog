import { loadAllPostsCached } from '@/lib/blog/loader';

import { loadAllLorePosts } from '@/lib/lore/loader';

import { buildLlmPostEntries, renderLlmIndexText } from './text';

export async function loadLlmIndexText(): Promise<string> {
  const [blogPosts, lorePosts] = await Promise.all([loadAllPostsCached(), loadAllLorePosts()]);

  const blogEntries = buildLlmPostEntries('blog', blogPosts);
  const loreEntries = buildLlmPostEntries('lore', lorePosts);
  return renderLlmIndexText(blogEntries, loreEntries);
}
