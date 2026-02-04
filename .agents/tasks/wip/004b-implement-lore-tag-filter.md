# Task 004b: Implement Lore Tag Filtering

**Parent:** 004-lore-listing-tag-filter  
**Type:** Implementation  
**Estimated Time:** 20 minutes

## Context
Integrate TagFilterBar into the lore listing page with full filtering and infinite scroll support. This mirrors the blog implementation but for lore content.

## Constraints
- Use **bun** for all node commands
- Use **yay -Syu** for system package installs
- Do temp work in **/tmp/agents-artifacts**
- Commit after this logical change
- Update **/tmp/codex-pr-metadata-d852049fb4.toml** (strict JSON) if PR metadata needs changes
- Follow **verification-first** approach
- **Sleep 5-10 seconds after every 3-5 actions**

## Steps

### 1. Backup and Verify
```bash
# Action 1
cp app/lore/LoreListPageClient.tsx /tmp/agents-artifacts/LoreListPageClient.tsx.backup

# Action 2
git status --short

# Action 3
wc -l app/lore/LoreListPageClient.tsx
```

**Sleep 5-10 seconds**

### 2. Import TagFilterBar
Add import at top of `app/lore/LoreListPageClient.tsx`:
```typescript
import TagFilterBar from '@/components/TagFilterBar'
```

```bash
# Action 4 (after edit)
head -20 app/lore/LoreListPageClient.tsx | grep -n "TagFilterBar"

# Action 5
git diff app/lore/LoreListPageClient.tsx | head -20
```

**Sleep 5-10 seconds**

### 3. Derive All Tags (Lore Posts)
Add logic to extract unique tags from lore allPosts:
- Get all tags from lore posts
- Trim and lowercase for uniqueness  
- Sort alphabetically
- Return unique array

```bash
# Action 6
grep -n "allTags" app/lore/LoreListPageClient.tsx

# Action 7
bun run build 2>&1 | tee /tmp/agents-artifacts/build-004b-step3.log | tail -20
```

**Sleep 7-10 seconds**

### 4. Add Selected Tags State
```bash
# Action 8
grep -n "useState.*selectedTags" app/lore/LoreListPageClient.tsx

# Action 9
grep -n "setSelectedTags" app/lore/LoreListPageClient.tsx
```

**Sleep 5-10 seconds**

### 5. Implement Filter Logic
Add computation for `filteredAllPosts`:
- Match lore posts that have ANY of the selected tags
- If no tags selected, return all lore posts

```bash
# Action 10
grep -n "filteredAllPosts" app/lore/LoreListPageClient.tsx

# Action 11
git diff app/lore/LoreListPageClient.tsx | grep -A 3 "filteredAllPosts"
```

**Sleep 5-10 seconds**

### 6. Update BlogList Integration
- Compute `filteredInitialPosts = filteredAllPosts.slice(0, 10)`
- Pass both filteredAllPosts and filteredInitialPosts to BlogList
- Add key prop based on selectedTags: `key={selectedTags.join(",")}`

```bash
# Action 12
grep -n "BlogList" app/lore/LoreListPageClient.tsx

# Action 13
grep -n "key=" app/lore/LoreListPageClient.tsx
```

**Sleep 5-10 seconds**

### 7. Render TagFilterBar
Add TagFilterBar component above BlogList with proper props

```bash
# Action 14
grep -n "<TagFilterBar" app/lore/LoreListPageClient.tsx

# Action 15
bun run build 2>&1 | tee /tmp/agents-artifacts/build-004b-final.log
```

**Sleep 7-10 seconds**

### 8. Verify Build
```bash
# Action 16
echo "Build exit code: $?"

# Action 17
tail -30 /tmp/agents-artifacts/build-004b-final.log
```

**Sleep 5-10 seconds**

### 9. Commit Changes
```bash
# Action 18
git status

# Action 19
git diff app/lore/LoreListPageClient.tsx | head -50

# Action 20
git add app/lore/LoreListPageClient.tsx
```

**Sleep 5-10 seconds**

```bash
# Action 21
git commit -m "lore: add tag filter to listing"

# Action 22
git log -1 --stat
```

**Sleep 5-10 seconds**

### 10. Update PR Metadata
```bash
# Action 23
python3 << 'EOF'
import json

metadata = {
    "title": "feat: Add tag filtering to Blog and Lore listings",
    "body": "## Changes\n\n- ✅ Add TagFilterBar component with Joy UI\n- ✅ Integrate tag filtering in Blog listing\n- ✅ Integrate tag filtering in Lore listing\n- Multi-select tag filtering with 'OR' logic\n- Keyboard accessible\n- Mobile responsive\n- Infinite scroll respects filter on both pages\n\n## Testing\n\n- Blog: http://localhost:3000/blog\n- Lore: http://localhost:3000/lore\n\n## Related Tasks\n\n- Task 001: ✅ Lore newest-first ordering\n- Task 002: ✅ TagFilterBar component\n- Task 003: ✅ Blog tag filter\n- Task 004: ✅ Lore tag filter"
}

with open("/tmp/codex-pr-metadata-d852049fb4.toml", "w") as f:
    f.write(f'title = {json.dumps(metadata["title"])}\n')
    f.write(f'body = {json.dumps(metadata["body"])}\n')
    
print("✅ PR metadata updated")
EOF

# Action 24
cat /tmp/codex-pr-metadata-d852049fb4.toml
```

## Acceptance Criteria
- ✅ TagFilterBar imported and rendered above BlogList
- ✅ allTags derived from lore allPosts (unique, sorted, case-insensitive)
- ✅ selectedTags state tracked
- ✅ filteredAllPosts computed correctly (OR logic for tags)
- ✅ BlogList receives filtered lore data
- ✅ BlogList remounts when filter changes (key prop)
- ✅ Build passes without errors
- ✅ Changes committed
- ✅ PR metadata updated with complete feature summary

## Outputs
- Modified: `app/lore/LoreListPageClient.tsx`
- Backup: `/tmp/agents-artifacts/LoreListPageClient.tsx.backup`
- Build logs: `/tmp/agents-artifacts/build-004b-*.log`
- Git commit: "lore: add tag filter to listing"

## Next Task
**005a-setup-desktop-qa-environment.md**

## Notes
- Filter logic: Match ANY selected tag (OR logic)
- Empty selection = show all lore posts
- Infinite scroll must respect filter (handled by key remount)
- BlogList component is reused from blog
- Sleep requirement: Every 3-5 actions, pause 5-10 seconds
