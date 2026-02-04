# Task Master Execution Plan
**Generated:** $(date)  
**Request:** "Do all of the tasks please"  
**Control Directory:** `.agents`

---

## Overview

This execution plan breaks down 4 WIP tasks (002-005) into 12 small, actionable execution tasks. Each task includes detailed steps, acceptance criteria, and follows the project's constraints.

---

## Task Breakdown

### Original WIP Task 002: Add TagFilterBar Component
**Status:** Ready for execution  
**Sub-tasks created:**
- ✅ `002a-verify-project-setup.md` (Verification, 5 min)
- ✅ `002b-implement-tagfilterbar-component.md` (Implementation, 15 min)

### Original WIP Task 003: Blog Tag Filtering
**Status:** Ready for execution (depends on 002)  
**Sub-tasks created:**
- ✅ `003a-verify-blog-structure.md` (Verification, 5 min)
- ✅ `003b-implement-blog-tag-filter.md` (Implementation, 20 min)

### Original WIP Task 004: Lore Tag Filtering
**Status:** Ready for execution (depends on 003)  
**Sub-tasks created:**
- ✅ `004a-verify-lore-structure.md` (Verification, 5 min)
- ✅ `004b-implement-lore-tag-filter.md` (Implementation, 20 min)

### Original WIP Task 005: Desktop QA in Firefox
**Status:** Ready for execution (depends on 004)  
**Sub-tasks created:**
- ✅ `005a-setup-desktop-qa-environment.md` (Setup, 10 min)
- ✅ `005b-run-dev-server.md` (Server Management, 5 min)
- ✅ `005c-firefox-qa-blog-tags.md` (QA Testing, 15 min)
- ✅ `005d-firefox-qa-lore-tags.md` (QA Testing, 15 min)
- ✅ `005e-qa-summary-and-cleanup.md` (Documentation, 10 min)

---

## Execution Sequence

### Phase 1: TagFilterBar Component (Tasks 002a-002b)
1. **002a** - Verify project setup and dependencies
2. **002b** - Implement TagFilterBar component, commit, update PR metadata

**Estimated Time:** 20 minutes  
**Commits:** 1  
**Dependencies:** None

### Phase 2: Blog Integration (Tasks 003a-003b)
3. **003a** - Verify blog page structure
4. **003b** - Integrate TagFilterBar into blog, commit, update PR metadata

**Estimated Time:** 25 minutes  
**Commits:** 1  
**Dependencies:** Phase 1 complete

### Phase 3: Lore Integration (Tasks 004a-004b)
5. **004a** - Verify lore page structure
6. **004b** - Integrate TagFilterBar into lore, commit, update PR metadata

**Estimated Time:** 25 minutes  
**Commits:** 1  
**Dependencies:** Phase 2 complete

### Phase 4: QA Testing (Tasks 005a-005e)
7. **005a** - Setup QA environment (Firefox, dependencies)
8. **005b** - Start dev server (detached mode)
9. **005c** - QA test blog tag filtering
10. **005d** - QA test lore tag filtering (includes Task 001 verification)
11. **005e** - Compile QA report and cleanup

**Estimated Time:** 55 minutes  
**Commits:** 0 (QA only)  
**Dependencies:** Phase 3 complete

---

## Total Estimates
- **Tasks:** 12 (11 execution + 1 index)
- **Time:** ~2 hours
- **Commits:** 3 (TagFilterBar, Blog filter, Lore filter)
- **PR Updates:** 3 (incremental)

---

## Constraints Applied to All Tasks

Every execution task includes these mandatory constraints:

1. **Use bun** for all node commands (never npm/yarn/pnpm)
2. **Use yay -Syu** for system package installs (PixelArch)
3. **Do temp work in /tmp/agents-artifacts**
4. **Commit after each logical change**
5. **Update /tmp/codex-pr-metadata-d852049fb4.toml** (strict JSON format)
6. **Follow verification-first approach**
7. **Sleep 5-10 seconds after every 3-5 actions**

---

## Task Files Location

All task files created in: `.agents/tasks/wip/`

```
.agents/tasks/wip/
├── 002a-verify-project-setup.md
├── 002b-implement-tagfilterbar-component.md
├── 003a-verify-blog-structure.md
├── 003b-implement-blog-tag-filter.md
├── 004a-verify-lore-structure.md
├── 004b-implement-lore-tag-filter.md
├── 005a-setup-desktop-qa-environment.md
├── 005b-run-dev-server.md
├── 005c-firefox-qa-blog-tags.md
├── 005d-firefox-qa-lore-tags.md
├── 005e-qa-summary-and-cleanup.md
└── TASKMASTER-INDEX.md (this file)
```

---

## Original WIP Tasks (Reference)

These original task files remain in place as parent documentation:
- `002-add-tag-filter-ui-component.md`
- `003-blog-listing-tag-filter.md`
- `004-lore-listing-tag-filter.md`
- `005-desktop-review-firefox.md`

---

## Execution Instructions for Coder Agents

### Start Here
Begin with **002a-verify-project-setup.md**

### Follow the Chain
Each task file specifies the "Next Task" at the bottom. Follow this sequence:
```
002a → 002b → 003a → 003b → 004a → 004b → 005a → 005b → 005c → 005d → 005e
```

### Task Format
Each task includes:
- **Context** - What this task does
- **Constraints** - Mandatory requirements
- **Steps** - Detailed numbered actions with bash commands
- **Sleep indicators** - When to pause
- **Acceptance Criteria** - Success checkpoints
- **Outputs** - Files/logs created
- **Next Task** - What to do after completion
- **Notes** - Important reminders

### Key Reminders
- ✅ Execute commands exactly as written
- ✅ Sleep after every 3-5 actions (5-10 seconds)
- ✅ Commit after each implementation task
- ✅ Update PR metadata as specified
- ✅ Verify before implementing (verification-first)
- ✅ Save all work to /tmp/agents-artifacts
- ❌ DO NOT skip verification tasks
- ❌ DO NOT modify multiple files in verification tasks
- ❌ DO NOT skip sleep requirements

---

## Feature Overview

**Goal:** Add tag filtering to Blog and Lore listing pages

**Components:**
1. Shared `TagFilterBar` component (Joy UI)
2. Blog page integration with multi-select filtering
3. Lore page integration with multi-select filtering
4. Desktop QA verification in Firefox

**Technical Details:**
- Multi-select with OR logic (match ANY selected tag)
- Keyboard accessible (Tab, Enter, Space)
- Mobile responsive (chips wrap)
- Infinite scroll respects filter
- Zero new dependencies

**Related:**
- Verifies Task 001 (Lore newest-first ordering) during QA

---

## Success Criteria

### Code
- ✅ TagFilterBar component created
- ✅ Blog integration complete
- ✅ Lore integration complete
- ✅ All builds pass
- ✅ 3 commits made with clear messages

### QA
- ✅ Manual testing in Firefox complete
- ✅ Tag filtering works on both pages
- ✅ Keyboard accessibility verified
- ✅ Mobile responsive verified
- ✅ No console errors
- ✅ Screenshots captured

### Documentation
- ✅ PR metadata updated with complete description
- ✅ QA master report compiled
- ✅ All artifacts indexed

---

## Artifacts Generated

All artifacts saved to `/tmp/agents-artifacts/`:
- Build logs
- QA test reports
- Screenshots
- Server logs
- Environment documentation
- Master QA report
- Artifacts index

---

## Task Master Notes

This plan follows the principle of **small, actionable tasks**:
- Each task is focused on a single concern
- Verification tasks separate from implementation
- Clear dependencies and sequence
- Detailed steps with exact commands
- Sleep requirements enforced
- Commit discipline maintained
- Temp work isolated to /tmp/agents-artifacts

Execution agents should:
1. Read each task file completely before starting
2. Follow steps in exact order
3. Check acceptance criteria before moving on
4. Document any deviations or issues
5. Save all outputs as specified

---

**Task Master Status:** ✅ Planning Complete  
**Ready for Execution:** YES  
**Start Task:** 002a-verify-project-setup.md

---

*Generated by Task Master in response to user request: "Do all of the tasks please"*
