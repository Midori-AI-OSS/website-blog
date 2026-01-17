# Blog Page Implementation - Task Overview

## Summary
This project implements a blog system with markdown posts, lazy loading, and a card-based UI inspired by Big-AGI and Midori AI Agents Runner.

## Task Breakdown (13 tasks)

### Phase 1: Research & Setup (Tasks 1-4)
1. **Clone Reference Repos** - Get Big-AGI and Agents-Runner for reference
2. **Analyze UI Patterns** - Study and document the design patterns to follow
3. **Setup Project Structure** - Initialize Bun project and create blog folder
4. **Install Dependencies** - Add markdown parser, front matter parser, etc.

### Phase 2: Core Functionality (Tasks 5-6)
5. **Create Markdown Parser** - Parse posts with `+++` front matter metadata
6. **Create Post Loader** - Load, sort, and paginate posts from filesystem

### Phase 3: UI Components (Tasks 7-9)
7. **Create Blog Card Component** - Preview card for each post
8. **Create Blog List Component** - Vertical list with lazy loading
9. **Create Post View Component** - Full post display with rendered markdown

### Phase 4: Integration (Task 10)
10. **Create Blog Page Route** - Set up routing and integrate all components

### Phase 5: Content & Testing (Tasks 11-13)
11. **Create Example Posts** - Sample content (15+ posts) for testing
12. **Test Blog Functionality** - Verify all acceptance criteria
13. **Polish and Document** - Final optimization and documentation

## Execution Order
Tasks are numbered for sequential execution. Some tasks can be done in parallel:
- Tasks 1-2 (research) can run in parallel
- Tasks 7-9 (components) can be developed in parallel after task 6 is complete
- Task 11 (example posts) can be done anytime after task 3

## Key Requirements
- **Bun**: Use Bun for all development and scripts
- **Filename Format**: `YYYY-MM-DD.md` in `blog/posts/`
- **Metadata**: Optional `+++` delimited front matter
- **Lazy Loading**: 10 posts initially, load more on scroll
- **Styling**: Big-AGI layout + Agents-Runner look-and-feel

## Acceptance Criteria
1. ✅ New posts appear without code changes
2. ✅ Posts sorted newest-to-oldest by filename date
3. ✅ Lazy loading (10 initial, 10 more on scroll)
4. ✅ Posts without metadata render correctly
5. ✅ Clicking card opens full post view
6. ✅ Styling matches reference patterns

## Notes for Coders
- Each task file contains detailed steps and success criteria
- Reference repos are in `/tmp/` (not added to this project)
- Use existing project UI components where possible
- Follow the markdown parser format strictly (`+++` delimiters)
- Test with 15+ posts to verify pagination

## Prerequisites
**⚠️ IMPORTANT:** Before starting Task 01, you MUST complete `00-TECHNICAL-DECISIONS.md` with all architectural choices. Tasks cannot be executed without these decisions.

## Next Steps
1. **First:** Complete `00-TECHNICAL-DECISIONS.md` (all checkboxes filled)
2. **Then:** Start with task 01 and proceed sequentially
3. Mark tasks as done by moving them to `.agents/tasks/done/` when complete
