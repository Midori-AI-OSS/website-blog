# Task: Create Example Blog Posts

## Objective
Create sample blog posts to test the blog system functionality.

## Prerequisites
- Task 03 completed (blog/posts/ directory exists)
- Know front matter format from technical decisions (`---` or `+++`)

## Requirements
- Create at least 15 posts (to test pagination)
- Include posts with and without metadata
- Include posts with and without cover images
- Use correct filename format: YYYY-MM-DD.md
- Various dates to test sorting

## Steps
1. Create posts with full metadata:
   - `blog/posts/2026-01-17.md` (with all fields)
   - `blog/posts/2026-01-15.md` (with all fields)
   - `blog/posts/2026-01-10.md` (with cover image)

2. Create posts without metadata:
   - `blog/posts/2026-01-12.md` (plain markdown only)
   - `blog/posts/2026-01-08.md` (plain markdown only)

3. Create posts with partial metadata:
   - `blog/posts/2026-01-14.md` (only title)
   - `blog/posts/2026-01-09.md` (title + summary)

4. Create more posts for pagination test:
   - Posts dated from 2026-01-01 to 2026-01-07
   - Mix of with/without metadata

5. Add sample content:
   - Headings
   - Paragraphs
   - Lists
   - Code blocks (if styled)
   - Images/links

## Success Criteria
- [ ] At least 15 posts created in `blog/posts/`
- [ ] All filenames follow YYYY-MM-DD.md format
- [ ] Mix of posts with full metadata (5+)
- [ ] Mix of posts with partial metadata (3+)
- [ ] Mix of posts without metadata (3+)
- [ ] Posts contain varied markdown content (headings, lists, code, links)
- [ ] Posts test edge cases (empty summary, missing fields, long content)
- [ ] Front matter delimiter matches technical decisions
- [ ] Cover image paths are placeholders (actual images not required)
- [ ] Date range spans multiple days to test sorting

## Example Post Structure

**With Standard YAML Front Matter (`---`):**

`blog/posts/2026-01-17.md`:
```markdown
---
title: Welcome to Our Blog
summary: Introducing our new blog with exciting updates
tags: [announcement, welcome]
cover_image: /assets/blog/welcome.png
---

# Welcome

This is our first blog post with exciting content!

## Features

- Markdown support
- Lazy loading
- Beautiful cards

```

**Without Front Matter:**

`blog/posts/2026-01-12.md`:
```markdown
# Plain Post

This post has no front matter metadata. The title will default to the filename date.

## It still works!

All markdown features are supported.
```

**Note:** If using `+++` delimiters (from technical decisions), adjust the delimiter in all example posts.
