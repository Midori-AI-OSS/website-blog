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
    globalThis.fetch = ((_: string | URL | Request) =>
      Promise.reject(new Error('radio offline'))) as typeof fetch;

    const response = await POST(
      request({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'get_radio_health', arguments: {} },
      }),
    );
    const body = await parseMcpResponse<{
      result?: { isError?: boolean; content?: Array<{ text: string }> };
    }>(response);

    expect(body.result?.isError).toBe(true);
    expect(body.result?.content?.[0]?.text).toContain('RADIO_NETWORK_ERROR');
    expect(body.result?.content?.[0]?.text).toContain('radio offline');
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
});
