import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  getLorePostBySlug,
  getLorePovPosts,
  getLoreStoryNeighbors,
  loadAllLorePosts,
  loadLoreGameGroups,
  loadLoreGameIndexes,
} from './loader';

let testRootDir = '';
let testPostsDir = '';
let testGamesDir = '';

async function createLorePost(filename: string, content: string) {
  await mkdir(testPostsDir, { recursive: true });
  await writeFile(join(testPostsDir, filename), content, 'utf-8');
}

async function createGameIndex(gameSlug: string, content: string) {
  const gameDir = join(testGamesDir, gameSlug);
  await mkdir(gameDir, { recursive: true });
  await writeFile(join(gameDir, 'index.md'), content, 'utf-8');
}

describe('Lore Loader', () => {
  beforeAll(async () => {
    testRootDir = await mkdtemp(join(tmpdir(), 'website-lore-posts-'));
    testPostsDir = join(testRootDir, 'lore', 'posts');
    testGamesDir = join(testRootDir, 'lore', 'games');

    if (testPostsDir.startsWith(process.cwd()) || testGamesDir.startsWith(process.cwd())) {
      throw new Error(`Refusing to run tests using real working directory: ${testRootDir}`);
    }

    await rm(testPostsDir, { recursive: true, force: true });
    await rm(testGamesDir, { recursive: true, force: true });
    await mkdir(testPostsDir, { recursive: true });
    await mkdir(testGamesDir, { recursive: true });

    await createLorePost('first-lore.md', `---
title: First Lore
date: 2026-01-15
tags: [lore, real-moments, riley]
game: real-moments
story_order: 1
---

# First Lore`);

    await createLorePost('second-lore.md', `---
title: Second Lore
date: 2026-01-16
tags: [lore, real-moments, riley]
game: real-moments
story_order: 2
---

# Second Lore`);

    await createLorePost('future-lore.md', `---
title: Future Lore
date: 2099-12-31
tags: [lore, real-moments, riley]
game: real-moments
story_order: 3
---

# Future Lore`);

    await createLorePost('side-pov.md', `---
title: Echo Side POV
date: 2026-01-18
tags: [lore, real-moments, echo]
game: real-moments
story_order: 2.5
---

# Echo Side POV`);

    await createLorePost('arc-post.md', `---
title: Arc Post
date: 2026-01-17
tags: [lore, celestial-covenant, luna]
game: celestial-covenant
story_order: 10
---

# Arc Post`);

    await createLorePost('missing-required.md', `---
title: Missing Required
tags: [lore]
---

# Missing Required`);

    await createLorePost('invalid file!.md', `---
title: Invalid Lore
---

# Invalid`);

    await createGameIndex('real-moments', `---
title: Real Moments
summary: Shared campaign event threads told through multiple POVs.
cover_image: /lore/riley-rumbodo.png
full_story_pov: riley
---
`);

    await createGameIndex('celestial-covenant', `---
title: Celestial Covenant
summary: Luna's DnD campaign arc.
cover_image: /lore/rite.png
full_story_pov: luna
---
`);
  });

  afterAll(async () => {
    if (testRootDir) {
      await rm(testRootDir, { recursive: true, force: true });
    }
  });

  test('loadAllLorePosts hides future-dated lore by default and enforces required metadata', async () => {
    const posts = await loadAllLorePosts({ now: '2026-01-16T18:00:00Z' }, testPostsDir);

    expect(posts.map((post) => post.filename)).toContain('second-lore.md');
    expect(posts.map((post) => post.filename)).toContain('first-lore.md');
    expect(posts.map((post) => post.filename)).not.toContain('future-lore.md');
    expect(posts.map((post) => post.filename)).not.toContain('missing-required.md');
  });

  test('loadAllLorePosts can include scheduled lore for direct routes', async () => {
    const posts = await loadAllLorePosts(
      {
        includeScheduled: true,
        now: '2026-01-16T18:00:00Z',
      },
      testPostsDir
    );

    expect(posts[0]?.filename).toBe('future-lore.md');
    expect(getLorePostBySlug(posts, 'future-lore')?.metadata.title).toBe('Future Lore');
  });

  test('loadLoreGameIndexes loads game containers from index files', async () => {
    const indexes = await loadLoreGameIndexes(testGamesDir);
    const realMoments = indexes.find((index) => index.slug === 'real-moments');

    expect(realMoments?.title).toBe('Real Moments');
    expect(realMoments?.fullStoryPov).toBe('riley');
    expect(realMoments?.summary).toContain('multiple POVs');
  });

  test('loadLoreGameGroups groups posts and derives character filters', async () => {
    const groups = await loadLoreGameGroups(
      { includeScheduled: false, now: '2026-01-16T18:00:00Z' },
      testPostsDir,
      testGamesDir
    );

    const realMoments = groups.find((group) => group.game.slug === 'real-moments');
    expect(realMoments).toBeDefined();
    expect(realMoments?.posts.map((post) => post.filename)).toEqual([
      'second-lore.md',
      'first-lore.md',
    ]);
    expect(realMoments?.characters).toContain('riley');
    expect(realMoments?.characters).not.toContain('real-moments');
  });

  test('getLoreStoryNeighbors resolves older/newer neighbors by story order', async () => {
    const allPosts = await loadAllLorePosts(
      { includeScheduled: true, now: '2026-01-16T18:00:00Z' },
      testPostsDir
    );
    const second = getLorePostBySlug(allPosts, 'second-lore');
    expect(second).toBeDefined();
    if (!second) throw new Error('second-lore missing');

    const neighbors = getLoreStoryNeighbors(allPosts, second);
    expect(neighbors.previous?.slug).toBe('first-lore');
    expect(neighbors.next?.slug).toBe('side-pov');
  });

  test('getLorePovPosts returns ordered posts for a specific POV tag', async () => {
    const allPosts = await loadAllLorePosts(
      { includeScheduled: true, now: '2026-01-16T18:00:00Z' },
      testPostsDir
    );

    const rileyPosts = getLorePovPosts(allPosts, 'real-moments', 'riley');
    expect(rileyPosts.map((post) => post.filename)).toEqual([
      'first-lore.md',
      'second-lore.md',
      'future-lore.md',
    ]);
  });
});
