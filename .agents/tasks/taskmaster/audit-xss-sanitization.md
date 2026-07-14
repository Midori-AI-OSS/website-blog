# Audit: XSS via Markdown and HTML Sanitization

**Target:**
- `lib/blog/parser.ts` (markdown-to-HTML pipeline)
- `lib/markdown/` (custom rehype/remark plugins)
- Usage of `rehype-sanitize`
- All places where user-authored markdown is rendered

Blog and lore posts are written in markdown and rendered to HTML. Even with `rehype-sanitize`, there may be gaps.

## Steps

1. Find every place where markdown content is converted to HTML and rendered. Search for `react-markdown`, `rehype-sanitize`, `dangerouslySetInnerHTML`, and `remark` in all source files.
2. Read `lib/blog/parser.ts` — trace the full rendering pipeline: gray-matter -> remark -> rehype -> react-markdown. Confirm `rehype-sanitize` is in the pipeline and with what configuration.
3. Read all files in `lib/markdown/` — custom plugins may introduce unsanitized HTML. Audit each plugin for raw HTML injection.
4. Confirm the sanitization schema used by `rehype-sanitize`:
   - Does it allow `<script>`, `<iframe>`, `<object>`, `<embed>`, `<style>`?
   - Does it allow event handlers (`onerror`, `onload`, `onclick`)?
   - Does it allow `javascript:` URLs in `href` or `src`?
   - Does it allow `<form>`, `<input>`, `<button>` elements?
5. Check if the `PasswordGate` rendering path (where content is "hidden" but in DOM) follows the same sanitization pipeline.
6. Check the `/llm` routes — do they render markdown to text without HTML escaping?
7. Check if any component uses `dangerouslySetInnerHTML` directly on post content.

## Output

- Document the exact sanitization pipeline with file paths and line numbers.
- Report allowed/disallowed HTML tags and attributes.
- Test with common XSS payloads in markdown (image `onerror`, script tags, javascript: links) and report which ones are blocked.
- Save findings to `/tmp/agents-artifacts/tasks/audit-xss-sanitization-report.md`.
