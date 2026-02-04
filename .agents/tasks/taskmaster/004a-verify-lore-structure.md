# Task 004a: Verify Lore Page Structure

**Parent:** 004-lore-listing-tag-filter  
**Type:** Verification  
**Estimated Time:** 5 minutes

## Context
Before integrating TagFilterBar into the lore listing, verify the lore page structure and understand the data flow. This should be similar to blog but needs independent verification.

## Constraints
- Use **bun** for all node commands
- Use **yay -Syu** for system package installs
- Do temp work in **/tmp/agents-artifacts**
- Follow **verification-first** approach
- **Sleep 5-10 seconds after every 3-5 actions**

## Steps

### 1. Verify Blog Implementation Complete
```bash
# Action 1
git log --oneline -5 | grep -i "blog.*tag"

# Action 2
test -f app/blog/BlogPageClient.tsx && grep -q "TagFilterBar" app/blog/BlogPageClient.tsx && echo "✅ Blog filter implemented" || echo "⚠️ Blog filter pending"
```

**Sleep 5-10 seconds**

### 2. Locate Lore Page Client
```bash
# Action 3
find app/lore -name "*Client*" -o -name "*client*" 2>/dev/null

# Action 4
test -f app/lore/LoreListPageClient.tsx && echo "✅ Found LoreListPageClient" || find app/lore -name "*.tsx" | head -5
```

**Sleep 5-10 seconds**

### 3. Analyze Lore Structure
```bash
# Action 5
head -50 app/lore/LoreListPageClient.tsx | tee /tmp/agents-artifacts/lore-analysis-004a.txt

# Action 6
grep -n "allPosts\|BlogList\|useState" app/lore/LoreListPageClient.tsx | head -10
```

**Sleep 5-10 seconds**

### 4. Check Lore Post Metadata
```bash
# Action 7
grep -n "tags\|tag" app/lore/LoreListPageClient.tsx

# Action 8
find lore -name "*.mdx" -o -name "*.md" | head -3 | xargs grep -h "tags:" 2>/dev/null | head -5
```

**Sleep 5-10 seconds**

### 5. Compare with Blog Implementation
```bash
# Action 9
diff <(grep "TagFilterBar" app/blog/BlogPageClient.tsx) <(echo "# Lore should follow similar pattern") > /tmp/agents-artifacts/lore-vs-blog-004a.txt || echo "Differences expected"

# Action 10
cat > /tmp/agents-artifacts/lore-structure-004a.txt << 'EOF'
Lore Page Analysis
==================
File: app/lore/LoreListPageClient.tsx

Current structure:
- allPosts array (lore posts)
- BlogList component (reused)
- Pagination/infinite scroll setup

Implementation plan:
- Mirror blog implementation
- Extract unique tags from lore posts
- Add selectedTags state
- Filter lore posts by selected tags
- Pass filtered data to BlogList
- Add key prop for remount on filter change

Next: Implement tag filtering logic
EOF

cat /tmp/agents-artifacts/lore-structure-004a.txt
```

## Acceptance Criteria
- ✅ Blog tag filter committed (verified via git log)
- ✅ LoreListPageClient.tsx file located
- ✅ Current structure documented
- ✅ Tag metadata format identified for lore posts
- ✅ Implementation plan documented

## Outputs
- Analysis: `/tmp/agents-artifacts/lore-analysis-004a.txt`
- Comparison: `/tmp/agents-artifacts/lore-vs-blog-004a.txt`
- Structure notes: `/tmp/agents-artifacts/lore-structure-004a.txt`

## Next Task
If all checks pass: **004b-implement-lore-tag-filter.md**

## PR Metadata Updates
None required for this verification task.

## Notes
- Do NOT make any code changes in this task
- Lore reuses BlogList component from blog
- Implementation should mirror blog pattern
- Sleep requirement: Every 3-5 actions, pause 5-10 seconds
