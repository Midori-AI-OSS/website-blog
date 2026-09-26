# Midori AI Public Blog MCP Server

The Midori AI blog provides a public, read-only MCP endpoint.

- Endpoint: `https://blog.midori-ai.xyz/api/mcp`
- Transport: Streamable HTTP
- Authentication: None
- Access: Read-only
- Local development: Run `bun run dev` and connect to `http://localhost:3000/api/mcp`.

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

## Response Behavior

List and search tools return compact JSON text alongside their structured metadata. Successful post fetches return normalized post text in the content block and keep access status and metadata in `structuredContent`, so the long-form body is sent once. Password-required and not-found results remain machine-readable and never include a protected body.

Radio data tools use the existing validated upstream client. `get_radio_health` uses the shared server-side health snapshot that drives Radio visibility in the website UI. When that snapshot is offline, MCP returns an explicit tool error with the cached health code and message. Other Radio tools keep their existing request and error behavior.
