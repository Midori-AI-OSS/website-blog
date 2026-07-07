# Task 14: Git Commits

## Objective
Stage and commit all changes in logical chunks.

## Requirements

### Commit Strategy

Stage and commit changes in these logical groups (in order):

1. **Matcher config + tests** — `lib/radio/loreSessionMap.ts` and `lib/radio/loreSessionMap.test.ts`
2. **Lore match API route** — `app/api/radio/lore-match/route.ts`
3. **Probe lyrics** — `app/api/radio/probe/route.ts` changes, `lib/radio/probe.test.ts`, `lib/radio/probeHelpers.ts` (if created)
4. **UI changes** — `app/radio/RadioPageClient.tsx` (lore wiring, lore panel, lyrics panel, art click toggle, mobile layout, animations)
5. **AGENTS.md update** — `/home/midori-ai/workspace/AGENTS.md` update
6. **Lint fixes** — any lint-related changes from task 10
7. **PR metadata** — `/tmp/agent-pr-metadata-d5bbb4508c.toml` update

### Commit messages

Use concise, descriptive commit messages matching the repo's existing style. Check `git log --oneline -10` for convention.

**Observed repo commit style** (from `git log --oneline -10`):
```
bb6a297 Add side-moment image for Weave Interviews Odium Sui
0980e78 Update title and summary for side-moments post
3ac4ee5 Add Weave Interviews Odium Sui side-moment with front matter, disclaimer, and cover image
6fa8ddc Refine formatting around Marisol's message in session-05
b60419b Remove duplicate room image from WEAVE post
86abe78 Fix nested thinking block paragraphs
fddb4b3 Fix remaining thinking block rendering failures
5212a9b Fix thinking blocks not rendering when tags are on their own lines
```

Style: **imperative mood, lowercase after first word, no period, no prefix**. Examples:
- `Add lore session map and tests`
- `Add lore match API route`
- `Add lyrics-eng extraction to radio probe`
- `Add lore and lyrics panels to radio page`
- `Add radio lore section to AGENTS.md`
- `Fix lint issues from radio feature`
- `Update PR metadata for radio polish`

### Before committing (for EACH commit):

1. Run `git status` to see all unstaged changes.
2. Stage only the relevant files: `git add <files...>`.
3. Run `git diff --staged` to verify exactly what's being committed.
4. Verify no secrets, tokens, or unwanted files are staged.
5. Ensure the commit is self-contained and the project would build if checked out at this commit (as much as possible — task order dependencies are expected).

### Important:
- Do NOT push — only commit locally.
- Commit in the order listed above.
- Each commit should be self-contained and buildable (not necessarily runnable if it depends on a later commit, but the TypeScript should compile).
- Do NOT stage `node_modules/`, `.next/`, or any generated files.
- Do NOT stage files under `.agents/tasks/wip/` (these are task definitions, not deliverables).

### Verify at the end:
- `git log --oneline -7` should show all 7 commits in order.
- `git status` should show a clean working tree (all changes committed).

## Done Criteria
- All changes committed in logical chunks (7 commits)
- No unwanted files staged
- Commit messages follow repo convention (imperative, lowercase, no prefix)
- Working tree is clean
