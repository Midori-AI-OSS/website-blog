# Task 002b: Implement TagFilterBar Component

**Parent:** 002-add-tag-filter-ui-component  
**Type:** Implementation  
**Estimated Time:** 15 minutes

## Context
Create a reusable TagFilterBar component using Joy UI that supports multi-select tag filtering with keyboard accessibility.

## Constraints
- Use **bun** for all node commands
- Use **yay -Syu** for system package installs
- Do temp work in **/tmp/agents-artifacts**
- Commit after this logical change
- Update **/tmp/codex-pr-metadata-d852049fb4.toml** (strict JSON) if PR metadata needs changes
- Follow **verification-first** approach
- **Sleep 5-10 seconds after every 3-5 actions**

## Steps

### 1. Verify Prerequisites
```bash
# Action 1
test -f components/TagFilterBar.tsx && echo "ERROR: File already exists" || echo "OK: Ready to create"

# Action 2
git status --short
```

**Sleep 5-10 seconds**

### 2. Create Component Skeleton
Create `components/TagFilterBar.tsx` with:
- TypeScript interface for props: `allTags: string[]`, `selectedTags: string[]`, `onChange(nextSelected: string[])`
- Joy UI imports: Box, Chip, Typography
- Functional component structure
- Hide when `allTags.length === 0`

```bash
# Action 3 (after file creation)
cat components/TagFilterBar.tsx | head -20

# Action 4
wc -l components/TagFilterBar.tsx
```

**Sleep 5-10 seconds**

### 3. Implement Core Logic
Add:
- "All" / "Clear" chip functionality
- Multi-select toggle (click to add/remove tags)
- Keyboard accessibility (Enter/Space)
- Chip group with soft/outlined styling
- Responsive wrapping for mobile

```bash
# Action 5
grep -n "onChange" components/TagFilterBar.tsx

# Action 6
grep -n "selectedTags" components/TagFilterBar.tsx
```

**Sleep 5-10 seconds**

### 4. Add Styling & Accessibility
- Ensure chips are focusable
- Add aria-labels
- Soft/outlined chip styles
- Wrap layout for small screens

```bash
# Action 7
grep -n "aria" components/TagFilterBar.tsx

# Action 8
grep -n "tabIndex" components/TagFilterBar.tsx
```

**Sleep 5-10 seconds**

### 5. Verify Implementation
```bash
# Action 9
bun run build 2>&1 | tee /tmp/agents-artifacts/build-002b.log

# Action 10
echo "Build exit code: $?"
```

**Sleep 7-10 seconds**

### 6. Commit Changes
```bash
# Action 11
git status

# Action 12
git add components/TagFilterBar.tsx

# Action 13
git commit -m "ui: add TagFilterBar component"

# Action 14
git log -1 --oneline
```

**Sleep 5-10 seconds**

### 7. Update PR Metadata
```bash
# Action 15
python3 << 'EOF'
import json

metadata = {
    "title": "feat: Add tag filtering to Blog and Lore listings",
    "body": "- Add TagFilterBar component with Joy UI\n- Multi-select tag filtering\n- Keyboard accessible\n- Mobile responsive"
}

with open("/tmp/codex-pr-metadata-d852049fb4.toml", "w") as f:
    f.write(f'title = {json.dumps(metadata["title"])}\n')
    f.write(f'body = {json.dumps(metadata["body"])}\n')
    
print("✅ PR metadata updated")
EOF
```

## Acceptance Criteria
- ✅ `components/TagFilterBar.tsx` created and exports component
- ✅ Props interface matches spec: allTags, selectedTags, onChange
- ✅ Component hides when allTags.length === 0
- ✅ Multi-select toggle working (click to add/remove)
- ✅ "All"/"Clear" affordance present
- ✅ Keyboard accessible (focusable chips, Enter/Space activation)
- ✅ Responsive wrapping for mobile
- ✅ Build passes without errors
- ✅ Changes committed
- ✅ PR metadata updated

## Outputs
- Component file: `components/TagFilterBar.tsx`
- Build log: `/tmp/agents-artifacts/build-002b.log`
- Git commit: "ui: add TagFilterBar component"
- PR metadata: `/tmp/codex-pr-metadata-d852049fb4.toml`

## Next Task
**003a-verify-blog-structure.md**

## Notes
- No new dependencies should be added
- Use existing Joy UI components only
- Keep styling consistent with project
- Sleep requirement: Every 3-5 actions, pause 5-10 seconds
