# Blog Posts

This directory contains the markdown files for the blog.

## Adding a New Post

1. Create a new markdown file in `blog/posts/` with the format `YYYY-MM-DD.md`.
2. Add the following frontmatter at the top of the file:

```markdown
---
title: Your Blog Post Title
summary: A brief summary of the post content for the preview card.
tags: [tag1, tag2, tag3]
cover_image: /blog/YYYY-MM-DD.png
---

Your content goes here...
```

### Images
- Place images in `public/blog/`.
- Reference them in `cover_image` or within the post using the path `/blog/filename.png`.

## Components
- `BlogCard`: Displays a preview of the post.
- `PostView`: Displays the full post content.
- `BlogList`: Renders the list of posts.
