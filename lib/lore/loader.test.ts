import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getLorePostBySlug, loadAllLorePosts } from './loader';

let testRootDir = '';
let testPostsDir = '';

async function createLorePost(filename: string, content: string) {
  await mkdir(testPostsDir, { recursive: true });
  await writeFile(join(testPostsDir, filename), content, 'utf-8');
}

describe('Lore Loader', () => {
  beforeAll(async () => {
    testRootDir = await mkdtemp(join(tmpdir(), 'website-lore-posts-'));
    testPostsDir = join(testRootDir, 'lore', 'posts');

    if (testPostsDir.startsWith(process.cwd())) {
      throw new Error(`Refusing to run tests using real working directory: ${testPostsDir}`);
    }

    await rm(testPostsDir, { recursive: true, force: true });
    await mkdir(testPostsDir, { recursive: true });

    await createLorePost('first-lore.md', `---
title: First Lore
date: 2026-01-15
tags: [lore, arc]
---

# First Lore`);

    await createLorePost('second-lore.md', `---
title: Second Lore
date: 2026-01-16
tags: [lore]
---

# Second Lore`);

    await createLorePost('future-lore.md', `---
title: Future Lore
date: 2099-12-31
tags: [lore, future]
---

# Future Lore`);

    await createLorePost('undated-lore.md', `---
title: Undated Lore
tags: [lore]
---

# Undated Lore`);

    await createLorePost('invalid file!.md', `---
title: Invalid Lore
---

# Invalid`);
  });

  afterAll(async () => {
    if (testRootDir) {
      await rm(testRootDir, { recursive: true, force: true });
    }
  });

  test('loadAllLorePosts hides future-dated lore by default', async () => {
    const posts = await loadAllLorePosts({ now: '2026-01-16T18:00:00Z' }, testPostsDir);

    expect(posts.map(post => post.filename)).toContain('second-lore.md');
    expect(posts.map(post => post.filename)).toContain('first-lore.md');
    expect(posts.map(post => post.filename)).toContain('undated-lore.md');
    expect(posts.map(post => post.filename)).not.toContain('future-lore.md');
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
});
