import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { NextRequest } from 'next/server';
import { imageByteCache } from '@/lib/content/imageByteCache.server';
import { getSharedImageCacheSeconds } from '@/lib/content/imageCachePolicy';
import {
  fingerprintImageSource,
  fingerprintPostImages,
  fingerprintPostImageTokenSource,
} from '@/lib/content/imageFingerprint.server';
import {
  clearSharedImageOwnerDateIndexForTests,
  getSharedImageOwnerDateIndex,
} from '@/lib/content/sharedImageOwnerDateIndex.server';
import { GET as getSharedImage } from './route';

let fixtureDirectory = '';
let owner = '';
let imageBytes = Buffer.from('shared image test bytes');

beforeEach(async () => {
  const sharedDirectory = join(process.cwd(), 'public/shared');
  await mkdir(sharedDirectory, { recursive: true });
  fixtureDirectory = await mkdtemp(join(sharedDirectory, 'test-owner-'));
  owner = basename(fixtureDirectory);
  imageBytes = Buffer.from('shared image test bytes');
  await writeFile(join(fixtureDirectory, 'sample.webp'), imageBytes);
  imageByteCache.clear();
  clearSharedImageOwnerDateIndexForTests();
});

afterEach(async () => {
  if (fixtureDirectory) await rm(fixtureDirectory, { recursive: true, force: true });
  clearSharedImageOwnerDateIndexForTests();
});

function makeRequest(path: string[], version?: string): NextRequest {
  const query = version ? `?v=${version}` : '';
  return new NextRequest(`http://localhost/api/shared-images/${path.join('/')}${query}`);
}

function makeParams(path: string[]) {
  return { params: Promise.resolve({ path }) };
}

describe('shared image route', () => {
  test('fingerprints and serves an owner-folder image with the short fallback policy', async () => {
    const fingerprint = createHash('sha256').update(imageBytes).digest('hex');
    const source = `/shared/${owner}/sample.webp`;
    const genericSource = await fingerprintImageSource(source);
    const fingerprintedSource = await fingerprintPostImageTokenSource(source);
    const response = await getSharedImage(
      makeRequest([owner, 'sample.webp'], fingerprint),
      makeParams([owner, 'sample.webp']),
    );

    expect(genericSource).toBe(source);
    expect(fingerprintedSource).toBe(`${source}?v=${fingerprint}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/webp');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60, immutable');
    expect(Buffer.from(await response.arrayBuffer())).toEqual(imageBytes);
  });

  test('fingerprints shared image tokens when preparing a post', async () => {
    const fingerprint = createHash('sha256').update(imageBytes).digest('hex');
    const content = `{{image: /shared/${owner}/sample.webp}}`;
    const post = await fingerprintPostImages({
      filename: 'shared-image-test.md',
      metadata: { title: 'Shared image test' },
      content,
      rawMarkdown: content,
    });

    expect(post.content).toContain(`${content.slice(0, -2)}?v=${fingerprint}}}`);
  });

  test('uses the matched owner post age for shared image cache freshness', async () => {
    const path = ['the-story-luna-midori', '01-veiled-crossing-first-shift.webp'];
    const bytes = await readFile(join(process.cwd(), 'public/shared', ...path));
    const fingerprint = createHash('sha256').update(bytes).digest('hex');
    const ownerDates = await getSharedImageOwnerDateIndex();
    const ttlSeconds = getSharedImageCacheSeconds(path, ownerDates);
    const response = await getSharedImage(makeRequest(path, fingerprint), makeParams(path));

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(`public, max-age=${ttlSeconds}, immutable`);
  });

  test('does not fingerprint a shared path used as a cover image', async () => {
    const post = await fingerprintPostImages({
      filename: 'shared-cover-test.md',
      metadata: { title: 'Shared cover test', cover_image: `/shared/${owner}/sample.webp` },
      content: 'No image tokens.',
      rawMarkdown: 'No image tokens.',
    });

    expect(post.metadata.cover_image).toBe(`/shared/${owner}/sample.webp`);
  });

  test('rejects stale versions and keeps legacy responses short lived', async () => {
    const stale = await getSharedImage(
      makeRequest([owner, 'sample.webp'], '0'.repeat(64)),
      makeParams([owner, 'sample.webp']),
    );
    const legacy = await getSharedImage(
      makeRequest([owner, 'sample.webp']),
      makeParams([owner, 'sample.webp']),
    );

    expect(stale.status).toBe(409);
    expect(legacy.status).toBe(200);
    expect(legacy.headers.get('Cache-Control')).toBe('public, max-age=60');
  });

  test('rejects invalid paths and unsupported image formats', async () => {
    const noOwner = await getSharedImage(makeRequest(['sample.webp']), makeParams(['sample.webp']));
    const traversal = await getSharedImage(
      makeRequest([owner, '..', 'sample.webp']),
      makeParams([owner, '..', 'sample.webp']),
    );
    const unsupported = await getSharedImage(
      makeRequest([owner, 'sample.svg']),
      makeParams([owner, 'sample.svg']),
    );

    expect(noOwner.status).toBe(400);
    expect(traversal.status).toBe(400);
    expect(unsupported.status).toBe(400);
  });

  test('returns 404 for a valid shared path with no image file', async () => {
    const response = await getSharedImage(
      makeRequest([owner, 'missing.png']),
      makeParams([owner, 'missing.png']),
    );

    expect(response.status).toBe(404);
  });
});
