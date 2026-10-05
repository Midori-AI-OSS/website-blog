import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { GET as getBlogImage } from '../../app/api/blog-images/[...path]/route';
import { imageByteCache } from './imageByteCache.server';
import { getFileFingerprint } from './imageFingerprint.server';

let testDirectory = '';

beforeEach(async () => {
  testDirectory = await mkdtemp(join(tmpdir(), 'website-blog-image-fingerprint-'));
  imageByteCache.clear();
});

afterEach(async () => {
  if (testDirectory) await rm(testDirectory, { recursive: true, force: true });
});

describe('image fingerprints and image response caching', () => {
  test('recomputes a SHA-256 fingerprint after an in-place image edit', async () => {
    const filepath = join(testDirectory, 'edited.png');
    await writeFile(filepath, 'initial image bytes');
    const initialFingerprint = await getFileFingerprint(filepath);

    await writeFile(filepath, 'updated image bytes');
    const future = new Date(Date.now() + 2000);
    await utimes(filepath, future, future);
    const updatedFingerprint = await getFileFingerprint(filepath);

    expect(initialFingerprint).toBe(
      createHash('sha256').update('initial image bytes').digest('hex'),
    );
    expect(updatedFingerprint).toBe(
      createHash('sha256').update('updated image bytes').digest('hex'),
    );
    expect(updatedFingerprint).not.toBe(initialFingerprint);
  });

  test('returns identical cache headers on filesystem and in-memory byte-cache responses', async () => {
    const filepath = join(process.cwd(), 'public/blog/2026-05-07.png');
    const imageBytes = await readFile(filepath);
    const fingerprint = createHash('sha256').update(imageBytes).digest('hex');
    const requestUrl = `http://localhost/api/blog-images/2026-05-07.png?v=${fingerprint}`;
    const params = { params: Promise.resolve({ path: ['2026-05-07.png'] }) };

    const first = await getBlogImage(new NextRequest(requestUrl), params);
    const second = await getBlogImage(new NextRequest(requestUrl), params);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.headers.get('Cache-Control')).toBe(second.headers.get('Cache-Control'));
    expect(first.headers.get('Content-Type')).toBe(second.headers.get('Content-Type'));
    expect(first.headers.get('Cache-Control')).toContain('immutable');
  });

  test('rejects stale fingerprints while keeping legacy URLs short lived', async () => {
    const stale = await getBlogImage(
      new NextRequest(`http://localhost/api/blog-images/2026-05-07.png?v=${'0'.repeat(64)}`),
      { params: Promise.resolve({ path: ['2026-05-07.png'] }) },
    );
    const legacy = await getBlogImage(
      new NextRequest('http://localhost/api/blog-images/2026-05-07.png'),
      {
        params: Promise.resolve({ path: ['2026-05-07.png'] }),
      },
    );

    expect(stale.status).toBe(409);
    expect(legacy.status).toBe(200);
    expect(legacy.headers.get('Cache-Control')).toBe('public, max-age=60');
  });

  test('fingerprints stable Blog archive artwork with a one-year policy', async () => {
    const filepath = join(process.cwd(), 'public/blog/years/2026/may.png');
    const imageBytes = await readFile(filepath);
    const fingerprint = createHash('sha256').update(imageBytes).digest('hex');
    const response = await getBlogImage(
      new NextRequest(`http://localhost/api/blog-images/years/2026/may.png?v=${fingerprint}`),
      { params: Promise.resolve({ path: ['years', '2026', 'may.png'] }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
  });
});
