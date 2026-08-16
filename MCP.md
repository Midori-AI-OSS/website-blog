# Midori AI Public MCP Server

The Midori AI website provides a public, read-only MCP endpoint at:

```text
https://blog.midori-ai.xyz/api/mcp
```

It uses the Streamable HTTP transport. No authentication is required, and it does not provide write, admin, streaming, or listener-heartbeat operations.

## ChatGPT Developer Mode

1. In ChatGPT, enable Developer mode under **Settings > Security and login**.
2. Open the Plugins interface and add a custom MCP server.
3. Enter `https://blog.midori-ai.xyz/api/mcp` as the server URL.
4. Save the connection and use the server's read-only tools in a chat.

For local development, run `bun run dev` and connect to `http://localhost:3000/api/mcp`.

## Tools

| Tool | Purpose |
| --- | --- |
| `list_blog_posts` | List recent public blog posts. |
| `search_blog_posts` | Search public blog metadata and content. |
| `get_blog_post` | Retrieve a blog post as normalized plain text. |
| `list_lore_posts` | List recent public lore posts. |
| `search_lore_posts` | Search public lore metadata and content. |
| `get_lore_post` | Retrieve a lore post as normalized plain text. |
| `get_radio_current` | Get the current radio track, optionally for a channel. |
| `list_radio_channels` | List radio channels. |
| `get_radio_artwork` | Get current-track artwork metadata, optionally for a channel. |
| `get_radio_health` | Get radio health and cache status. |

`list_*` and `search_*` accept an optional `limit`, which defaults to 5 and must be between 1 and 30. `search_*` requires a non-empty `query`.

## Protected Posts

Posts with a `password` front-matter field are excluded from list and search results. A direct `get_blog_post` or `get_lore_post` call can include an optional `password` input. If it is absent or invalid, the tool returns public metadata and the post's password hint, but never the post body or password. A valid password returns normalized plain text.

## Response Behavior

Content tools return stable metadata including canonical and cover image URLs. Radio tools use the existing validated upstream radio client. Upstream network, HTTP, malformed-response, version, and null-data failures are returned as explicit tool errors; the MCP server does not fabricate or cache stale values.
