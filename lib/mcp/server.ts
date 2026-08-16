import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

import {
  fetchArt,
  fetchChannels,
  fetchCurrent,
  fetchHealth,
  RadioApiError,
} from '@/lib/radio/client';
import { getMcpPost, listMcpPosts, searchMcpPosts } from './content';

const limitSchema = z.number().int().min(1).max(30).default(5);
const channelSchema = z.string().trim().min(1).optional();

function successResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown service failure';
  const code = error instanceof RadioApiError ? error.code : 'MCP_TOOL_ERROR';
  const status = error instanceof RadioApiError ? error.status : 500;
  const data = { error: { code, message, status } };

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    isError: true,
  };
}

function registerPostTools(server: McpServer, type: 'blog' | 'lore') {
  const title = type === 'blog' ? 'blog posts' : 'lore posts';

  server.registerTool(
    `list_${type}_posts`,
    {
      title: `List ${type === 'blog' ? 'Blog' : 'Lore'} Posts`,
      description: `List the newest public Midori AI ${title}. Password-protected posts are excluded.`,
      inputSchema: z.object({ limit: limitSchema.optional() }),
    },
    async ({ limit }) => successResult({ posts: await listMcpPosts(type, limit) }),
  );

  server.registerTool(
    `search_${type}_posts`,
    {
      title: `Search ${type === 'blog' ? 'Blog' : 'Lore'} Posts`,
      description: `Search public Midori AI ${title} by title, metadata, and body text. Password-protected posts are excluded.`,
      inputSchema: z.object({ query: z.string().trim().min(1), limit: limitSchema.optional() }),
    },
    async ({ query, limit }) => successResult({ posts: await searchMcpPosts(type, query, limit) }),
  );

  server.registerTool(
    `get_${type}_post`,
    {
      title: `Get ${type === 'blog' ? 'Blog' : 'Lore'} Post`,
      description: `Get a Midori AI ${type} post by slug as normalized plain text. Password-protected posts require their password to reveal content.`,
      inputSchema: z.object({ slug: z.string().trim().min(1), password: z.string().optional() }),
    },
    async ({ slug, password }) => successResult(await getMcpPost(type, slug, password)),
  );
}

export function createMidoriMcpServer(): McpServer {
  const server = new McpServer({ name: 'midori-ai-public-data', version: '1.0.0' });

  registerPostTools(server, 'blog');
  registerPostTools(server, 'lore');

  server.registerTool(
    'get_radio_current',
    {
      title: 'Get Current Radio Track',
      description: 'Get the currently playing Midori AI Radio track, optionally for a channel.',
      inputSchema: z.object({ channel: channelSchema }),
    },
    async ({ channel }) => {
      try {
        return successResult({ current: await fetchCurrent(channel) });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'list_radio_channels',
    {
      title: 'List Radio Channels',
      description: 'List public Midori AI Radio channels and their track counts.',
    },
    async () => {
      try {
        return successResult({ channels: await fetchChannels() });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'get_radio_artwork',
    {
      title: 'Get Radio Artwork Metadata',
      description:
        'Get artwork metadata for the current Midori AI Radio track, optionally for a channel.',
      inputSchema: z.object({ channel: channelSchema }),
    },
    async ({ channel }) => {
      try {
        return successResult({ artwork: await fetchArt(channel) });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'get_radio_health',
    {
      title: 'Get Radio Health',
      description: 'Get Midori AI Radio health and cache status.',
    },
    async () => {
      try {
        return successResult({ health: await fetchHealth() });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  return server;
}

export const midoriMcpHandler = createMcpHandler(createMidoriMcpServer, {
  legacy: 'stateless',
});
