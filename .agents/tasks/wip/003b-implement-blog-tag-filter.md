# Task 003b: Implement Blog Tag Filtering

**Parent:** 003-blog-listing-tag-filter  
**Type:** Implementation  
**Estimated Time:** 20 minutes

## Context
Integrate TagFilterBar into the blog listing page with full filtering and infinite scroll support.

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
cp app/blog/BlogPageClient.tsx /tmp/agents-artifacts/BlogPageClient.tsx.backup

# Action 2
git status --short

# Action 3
wc -l app/blog/BlogPageClient.tsx
```

**Sleep 5-10 seconds**

### 2. Import TagFilterBar
Add import at top of `app/blog/BlogPageClient.tsx`:
```typescript
import TagFilterBar from '@/components/TagFilterBar'
```

```bash
# Action 4 (after edit)
head -20 app/blog/BlogPageClient.tsx | grep -n "TagFilterBar"

# Action 5
git diff app/blog/BlogPageClient.tsx | head -20
```

**Sleep 5-10 seconds**

### 3. Derive All Tags
Add logic to extract unique tags from allPosts:
- Get all tags from posts
- Trim and lowercase for uniqueness
- Sort alphabetically
- Return unique array

```bash
# Action 6
grep -n "allTags" app/blog/BlogPageClient.tsx

# Action 7
bun run build 2>&1 | tee /tmp/agents-artifacts/build-003b-step3.log | tail -20
```

**Sleep 7-10 seconds**

### 4. Add Selected Tags State
```bash
# Action 8
grep -n "useState.*selectedTags" app/blog/BlogPageClient.tsx

# Action 9
grep -n "setSelectedTags" app/blog/BlogPageClient.tsx
```

**Sleep 5-10 seconds**

### 5. Implement Filter Logic
Add computation for `filteredAllPosts`:
- Match posts that have ANY of the selected tags
- If no tags selected, return all posts

```bash
# Action 10
grep -n "filteredAllPosts" app/blog/BlogPageClient.tsx

# Action 11
git diff app/blog/BlogPageClient.tsx | grep -A 3 "filteredAllPosts"
```

**Sleep 5-10 seconds**

### 6. Update BlogList Integration
- Compute `filteredInitialPosts = filteredAllPosts.slice(0, 10)`
- Pass both filteredAllPosts and filteredInitialPosts to BlogList
- Add key prop based on selectedTags to force remount: `key={selectedTags.join(",")}`

```bash
# Action 12
grep -n "BlogList" app/blog/BlogPageClient.tsx

# Action 13
grep -n "key=" app/blog/BlogPageClient.tsx
```

**Sleep 5-10 seconds**

### 7. Render TagFilterBar
Add TagFilterBar component above BlogList with proper props

```bash
# Action 14
grep -n "<TagFilterBar" app/blog/BlogPageClient.tsx

# Action 15
bun run build 2>&1 | tee /tmp/agents-artifacts/build-003b-final.log
```

**Sleep 7-10 seconds**

### 8. Verify Build
```bash
# Action 16
echo "Build exit code: $?"

# Action 17
tail -30 /tmp/agents-artifacts/build-003b-final.log
```

**Sleep 5-10 seconds**

### 9. Commit Changes
```bash
# Action 18
git status

# Action 19
git diff app/blog/BlogPageClient.tsx | head -50

# Action 20
git add app/blog/BlogPageClient.tsx
```

**Sleep 5-10 seconds**

```bash
# Action 21
git commit -m "blog: add tag filter to listing"

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
    "body": "## Changes\n\n- ✅ Add TagFilterBar component with Joy UI\n- ✅ Integrate tag filtering in Blog listing\n- Multi-select tag filtering with 'OR' logic\n- Keyboard accessible\n- Mobile responsive\n- Infinite scroll respects filter\n\n## Testing\n\nVerify at http://localhost:3000/blog"
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
- ✅ allTags derived from allPosts (unique, sorted, case-insensitive)
- ✅ selectedTags state tracked
- ✅ filteredAllPosts computed correctly (OR logic for tags)
- ✅ BlogList receives filtered data
- ✅ BlogList remounts when filter changes (key prop)
- ✅ Build passes without errors
- ✅ Changes committed
- ✅ PR metadata updated

## Outputs
- Modified: `app/blog/BlogPageClient.tsx`
- Backup: `/tmp/agents-artifacts/BlogPageClient.tsx.backup`
- Build logs: `/tmp/agents-artifacts/build-003b-*.log`
- Git commit: "blog: add tag filter to listing"

## Next Task
**004a-verify-lore-structure.md**

## Notes
- Filter logic: Match ANY selected tag (OR logic)
- Empty selection = show all posts
- Infinite scroll must respect filter (handled by key remount)
- Sleep requirement: Every 3-5 actions, pause 5-10 seconds
