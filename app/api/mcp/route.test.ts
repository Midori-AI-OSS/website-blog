import { afterEach, describe, expect, test } from 'bun:test';

import { OPTIONS, POST } from './route';

const originalFetch = globalThis.fetch;

function request(body: object): Request {
  return new Request('https://example.test/api/mcp', {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function parseMcpResponse<T>(response: Response): Promise<T> {
  const body = await response.text();
  const eventData = body.match(/^data: (.+)$/m)?.[1];
  return JSON.parse(eventData ?? body) as T;
}

interface McpToolResult {
  isError?: boolean;
  content?: Array<{ type?: string; text: string }>;
  structuredContent?: unknown;
}

async function callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
  const response = await POST(
    request({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  );
  const body = await parseMcpResponse<{ result?: McpToolResult }>(response);

  expect(response.status).toBe(200);
  expect(body.result).toBeDefined();
  return body.result ?? {};
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('/api/mcp', () => {
  test('answers CORS preflight requests', () => {
    const response = OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
  });

  test('lists only the documented read-only tool set and adds public CORS headers', async () => {
    const response = await POST(
      request({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      }),
    );

    const body = await parseMcpResponse<{
      result?: { tools?: Array<{ name: string }> };
    }>(response);
    const toolNames = body.result?.tools?.map((tool) => tool.name) ?? [];

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(toolNames).toEqual([
      'list_blog_posts',
      'search_blog_posts',
      'get_blog_post',
      'list_lore_posts',
      'search_lore_posts',
      'get_lore_post',
      'get_radio_current',
      'list_radio_channels',
      'get_radio_artwork',
      'get_radio_health',
    ]);
    expect(toolNames.some((name) => /write|create|update|delete|heartbeat/i.test(name))).toBe(
      false,
    );
  });

  test('returns explicit radio upstream failures without inventing data', async () => {
    globalThis.fetch = (() => Promise.reject(new Error('radio offline'))) as typeof fetch;

    const result = await callTool('get_radio_health', {});

    expect(result.isError).toBe(true);
    expect(result.content?.[0]?.text).toContain('RADIO_NETWORK_ERROR');
    expect(result.content?.[0]?.text).toContain('radio offline');
    expect(result.content?.[0]?.text).not.toContain('\n');
  });

  test('validates malformed upstream radio responses', async () => {
    globalThis.fetch = ((_: string | URL | Request) =>
      Promise.resolve(
        new Response(JSON.stringify({ unexpected: true }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )) as typeof fetch;

    const response = await POST(
      request({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'get_radio_health', arguments: {} },
      }),
    );
    const body = await parseMcpResponse<{
      result?: { isError?: boolean; content?: Array<{ text: string }> };
    }>(response);

    expect(body.result?.isError).toBe(true);
    expect(body.result?.content?.[0]?.text).toContain('RADIO_INVALID_ENVELOPE');
  });

  test('applies the default post limit when a caller omits it', async () => {
    const response = await POST(
      request({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'list_lore_posts', arguments: {} },
      }),
    );
    const body = await parseMcpResponse<{
      result?: { content?: Array<{ text: string }> };
    }>(response);
    const content = JSON.parse(body.result?.content?.[0]?.text ?? '{}') as {
      posts?: unknown[];
    };

    expect(content.posts).toHaveLength(5);
  });

  test('keeps list and search result mirrors compact for blog and lore', async () => {
    const results = [
      await callTool('list_blog_posts', { limit: 1 }),
      await callTool('search_blog_posts', { query: 'session 0 is done', limit: 1 }),
      await callTool('list_lore_posts', { limit: 1 }),
      await callTool('search_lore_posts', { query: 'Luz Blessee', limit: 1 }),
    ];

    for (const result of results) {
      const text = result.content?.[0]?.text;

      expect(result.structuredContent).toBeDefined();
      expect(text).toBe(JSON.stringify(result.structuredContent));
      expect(text).not.toContain('\n');
    }
  });

  test('returns successful blog and lore post text only in content', async () => {
    const blogResult = await callTool('get_blog_post', { slug: '2026-09-22' });
    const loreResult = await callTool('get_lore_post', { slug: 'luz-blessee-bar' });
    const blogText = blogResult.content?.[0]?.text ?? '';
    const loreText = loreResult.content?.[0]?.text ?? '';

    expect(blogText).toContain('Title: session 0 is done and cookie club got way too real again');
    expect(blogText).toContain('I GOT SESSION 0 REWORK DONE.');
    expect(blogResult.structuredContent).toMatchObject({
      found: true,
      access: 'granted',
      post: { type: 'blog', slug: '2026-09-22' },
    });
    expect(blogResult.structuredContent).not.toHaveProperty('content');
    expect(JSON.stringify(blogResult.structuredContent)).not.toContain(
      'I GOT SESSION 0 REWORK DONE.',
    );

    expect(loreText).toContain('Title: Luz Blessee, Don’t Drink the Clear Ice');
    expect(loreText).toContain("I got out of Leo's car");
    expect(loreResult.structuredContent).toMatchObject({
      found: true,
      access: 'granted',
      post: { type: 'lore', slug: 'luz-blessee-bar' },
    });
    expect(loreResult.structuredContent).not.toHaveProperty('content');
    expect(JSON.stringify(loreResult.structuredContent)).not.toContain("I got out of Leo's car");
  });

  test('keeps password-required and unknown-post results compact and body-free', async () => {
    const missingPassword = await callTool('get_lore_post', {
      slug: 'side-moments-familia-inventa',
    });
    const wrongPassword = await callTool('get_lore_post', {
      slug: 'side-moments-familia-inventa',
      password: 'incorrect',
    });

    for (const result of [missingPassword, wrongPassword]) {
      const text = result.content?.[0]?.text;

      expect(result.structuredContent).toMatchObject({
        found: true,
        access: 'password_required',
        post: { slug: 'side-moments-familia-inventa' },
      });
      expect(text).toBe(JSON.stringify(result.structuredContent));
      expect(text).not.toContain('matthew-schwartz');
    }

    const notFound = await callTool('get_blog_post', { slug: '2099-01-01' });

    expect(notFound.structuredContent).toEqual({ found: false, access: 'not_found' });
    expect(notFound.content?.[0]?.text).toBe('{"found":false,"access":"not_found"}');
  });
});
