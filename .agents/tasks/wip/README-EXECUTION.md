# Execution Guide for Coder Agents

## Quick Start

**Start here:** `002a-verify-project-setup.md`

**Follow the chain:**
```
002a → 002b → 003a → 003b → 004a → 004b → 005a → 005b → 005c → 005d → 005e
```

Each task file specifies the next task at the bottom.

---

## Task Structure

Every task follows this format:

```markdown
# Task XXXx: [Title]
**Parent:** Original WIP task reference
**Type:** Verification | Implementation | QA | Setup
**Estimated Time:** X minutes

## Context
What this task does and why

## Constraints
- Use bun for node commands
- Use yay -Syu for installs
- Do temp work in /tmp/agents-artifacts
- Commit after logical changes
- Update PR metadata (strict JSON)
- Verification-first approach
- Sleep 5-10 seconds after every 3-5 actions

## Steps
Numbered steps with bash commands and sleep indicators

## Acceptance Criteria
Checklist of success conditions

## Outputs
Files and logs created

## Next Task
What to execute next
```

---

## Important Rules

### ✅ DO
- Read the entire task file before starting
- Execute steps in exact order
- Sleep 5-10 seconds after every 3-5 actions
- Verify acceptance criteria before proceeding
- Save all outputs to `/tmp/agents-artifacts`
- Commit after implementation tasks (002b, 003b, 004b)
- Update PR metadata when specified

### ❌ DO NOT
- Skip verification tasks
- Modify code in verification tasks
- Skip sleep requirements
- Execute tasks out of order
- Use npm/yarn/pnpm (always use bun)
- Ignore acceptance criteria

---

## Sleep Requirement

**MANDATORY:** After every 3-5 actions, sleep 5-10 seconds.

Example from task files:
```bash
# Action 1
command1

# Action 2
command2

# Action 3
command3

**Sleep 5-10 seconds**

# Action 4
command4
```

This prevents rate limiting and system overload.

---

## Phases Overview

### Phase 1: TagFilterBar Component
- **002a** (5 min) - Verify environment and dependencies
- **002b** (15 min) - Create TagFilterBar component
- **Commit:** "ui: add TagFilterBar component"

### Phase 2: Blog Integration
- **003a** (5 min) - Verify blog page structure
- **003b** (20 min) - Integrate filter into blog
- **Commit:** "blog: add tag filter to listing"

### Phase 3: Lore Integration
- **004a** (5 min) - Verify lore page structure
- **004b** (20 min) - Integrate filter into lore
- **Commit:** "lore: add tag filter to listing"

### Phase 4: QA Testing
- **005a** (10 min) - Setup Firefox and environment
- **005b** (5 min) - Start dev server (detached)
- **005c** (15 min) - Test blog filtering in Firefox
- **005d** (15 min) - Test lore filtering in Firefox
- **005e** (10 min) - Compile QA report and cleanup
- **No commits** (QA only)

---

## Verification-First Approach

Each phase starts with a verification task:
1. Check prerequisites exist
2. Understand current structure
3. Document findings
4. Confirm ready for implementation

This prevents errors and ensures understanding before making changes.

---

## Artifacts Location

All temporary work goes to: `/tmp/agents-artifacts/`

Types of artifacts:
- Build logs
- QA test reports
- Screenshots
- Server logs
- Backups
- Analysis documents
- Master QA report

See `005e-qa-summary-and-cleanup.md` for complete artifacts index.

---

## PR Metadata Updates

File: `/tmp/codex-pr-metadata-d852049fb4.toml`

Format (strict JSON strings):
```toml
title = "feat: Add tag filtering to Blog and Lore listings"
body = "## Changes\n\n- Feature 1\n- Feature 2"
```

Updated in tasks:
- 002b (initial)
- 003b (add blog)
- 004b (add lore, complete)

---

## Expected Git Commits

### Commit 1 (Task 002b)
```
ui: add TagFilterBar component

- Create components/TagFilterBar.tsx
- Props: allTags, selectedTags, onChange
- Multi-select with OR logic
- Keyboard accessible
- Mobile responsive
```

### Commit 2 (Task 003b)
```
blog: add tag filter to listing

- Import and render TagFilterBar
- Extract unique tags from posts
- Filter logic with OR matching
- Infinite scroll respects filter
```

### Commit 3 (Task 004b)
```
lore: add tag filter to listing

- Import and render TagFilterBar
- Extract unique tags from lore posts
- Filter logic with OR matching
- Infinite scroll respects filter
- Maintains newest-first order
```

---

## Troubleshooting

### If a Build Fails
1. Check the build log in `/tmp/agents-artifacts/`
2. Verify bun dependencies installed
3. Check TypeScript errors
4. Do NOT proceed to next task

### If Verification Fails
1. Document the failure
2. Report to user/task master
3. Do NOT proceed to implementation

### If QA Finds Issues
1. Document in QA report
2. Do NOT fix in QA tasks
3. Create new task for fixes
4. Complete QA documentation anyway

---

## Success Indicators

### Code Success
- ✅ All 3 commits made
- ✅ All builds pass
- ✅ No TypeScript errors
- ✅ Git history clean

### QA Success
- ✅ Both pages show TagFilterBar
- ✅ Filtering works correctly
- ✅ Keyboard navigation works
- ✅ Mobile responsive
- ✅ No console errors
- ✅ Screenshots captured

### Documentation Success
- ✅ PR metadata complete
- ✅ QA master report generated
- ✅ All artifacts indexed
- ✅ Cleanup completed

---

## Final Deliverables

After completing all tasks (002a through 005e):

1. **Code Changes**
   - `components/TagFilterBar.tsx` (new)
   - `app/blog/BlogPageClient.tsx` (modified)
   - `app/lore/LoreListPageClient.tsx` (modified)

2. **Git History**
   - 3 clean commits with descriptive messages

3. **Documentation**
   - `/tmp/agents-artifacts/QA-MASTER-REPORT.md`
   - `/tmp/agents-artifacts/INDEX.md`
   - All QA test reports and screenshots

4. **PR Metadata**
   - `/tmp/codex-pr-metadata-d852049fb4.toml` (complete)

---

## Questions?

Refer to:
- `TASKMASTER-INDEX.md` - Master planning document
- Individual task files - Detailed instructions
- Original WIP tasks (002-005) - High-level requirements
- `AGENTS.md` - Project rules

---

**Ready to start?** → Open `002a-verify-project-setup.md`

**Current Status:** All tasks written, ready for execution

**Estimated Total Time:** ~2 hours for complete execution

---

*Generated by Task Master for execution agents*
