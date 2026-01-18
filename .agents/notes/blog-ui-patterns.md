# Blog UI Patterns Summary

Analyzed reference implementations from:
- **Big-AGI**: `/tmp/big-AGI/src/apps/news/` - Card-based news layout
- **Agents-Runner**: `/tmp/Agents-Runner/agents_runner/style/` - Midori AI styling

## Big-AGI Card Layout

### Component Structure
- **Location**: `src/apps/news/AppNews.tsx` and `news.data.tsx`
- **Framework**: React + Next.js with Material-UI Joy
- **Pattern**: NewsCard component wrapped in Card with CardContent and optional CardOverflow

### Layout Details
```tsx
<Card color={props.color} variant={props.variant ?? 'plain'} 
  sx={{ mb: 3, minHeight: 32, gap: 1, boxShadow: !idx ? 'md' : undefined }}>
  <CardContent sx={{ position: 'relative', pr: addPadding ? 4 : 0 }}>
    {/* Title with version + date */}
    {/* Unordered list of features */}
  </CardContent>
  {/* Optional CardOverflow with AspectRatio 2:1 cover image */}
</Card>
```

### Spacing & Dimensions
- **Card margin-bottom**: `3` (MUI spacing units, typically 24px)
- **Card min-height**: `32px`
- **Card gap**: `1` (8px between CardContent and CardOverflow)
- **Container**: `maxWidth='sm'` (MUI breakpoint, typically 600px)
- **Page padding**: `{ xs: 3, md: 6 }` (24px mobile, 48px desktop)
- **List padding**: `paddingInlineStart: '1.5rem'`
- **List margin**: `marginTop: 8px, marginBottom: 8px`

### Typography
- **Title level**: `title-sm` (small title size)
- **Body text**: `fontSize: 'sm'` (small body text)
- **Date/timestamp**: `level='body-sm'` (small body)
- **Page heading**: `level='h1'` with `fontSize: '2.7rem'`
- **Font family**: Inter (400, 500, 600, 700 weights)
- **Code font**: JetBrains Mono

### Interaction States
- **First card**: Enhanced with `boxShadow: 'md'`
- **Hover**: Implicit via MUI Joy theme
- **Colors**: Supports `color` and `variant` props (primary, neutral, warning, etc.)
- **Card variants**: `plain` (default), `solid`, `soft`, `outlined`

### Container Structure
- Centered container with `maxWidth='sm'`
- Vertical stack with auto-sized items
- Load-more pattern: Expander button shows `NEWS_LOAD_STEP` (2) more items
- Initial display: `NEWS_INITIAL_COUNT` (3) items

### Color Scheme (from app.theme.ts)
**Dark Mode:**
- popup: `#24292c`
- surface: `#171A1C` (neutral-800)
- level1: `#0B0D0E` (neutral-900)
- level2: `#171A1C` (neutral-800)
- body: `#060807`

**Light Mode:**
- surface: `#FBFCFE` (neutral-50)
- level1: `#F0F4F8` (neutral-100)
- level2: `#DDE7EE` (neutral-200)
- body: `#CDD7E1` (neutral-300)

## Agents-Runner Styling

### Color Palette (`style/palette.py`)
- **Primary text**: `#EDEFF5` (light gray/white)
- **Placeholder text**: `rgba(237, 239, 245, 120)` (50% opacity)
- **Accent/Selection**: `rgba(56, 189, 248, 120)` (cyan, 50% opacity)
- **Background base**: `rgba(18, 20, 28, *)` (dark blue-gray with varying alpha)

### Typography (`style/metrics.py`)
- **Font family**: `Inter, Segoe UI, system-ui, -apple-system, sans-serif`
- **Base font size**: `13px`
- **Monospace**: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace` (12px for logs)

### Border & Radius Values
- **Border radius**: `0px` **EVERYWHERE** (sharp corners policy)
- **Standard border**: `1px solid rgba(255, 255, 255, 22)` (subtle light border)
- **Hover border**: `1px solid rgba(56, 189, 248, 50-80)` (cyan accent)
- **Focus border**: `1px solid rgba(56, 189, 248, 120)` (brighter cyan)
- **Accent left border**: `4px solid` (colored by task "stain")

### Spacing Scale
- **Input padding**: `10px`
- **Button padding**: `9px 12px` (vertical, horizontal)
- **Tab padding**: `8px 12px`
- **Table cell padding**: `6px 8px`
- **Header padding**: `8px 10px`
- **Checkbox spacing**: `10px`

### Shadow/Effects
- **Gradients**: Linear gradients for task rows
  ```css
  qlineargradient(x1: 0, y1: 0, x2: 1, y2: 1,
    stop: 0 rgba(color, alpha),
    stop: 1 rgba(18, 20, 28, 55))
  ```
- **No box-shadow**: Borders and gradients used instead
- **Transparency layers**: Heavy use of rgba with varying alpha channels

### Task Row Pattern (`style/template_tasks.py`)
- **Base styling**: Transparent background with gradient
- **Left border**: `4px solid` accent color (acts as visual category indicator)
- **Border**: `1px solid rgba(255, 255, 255, 12)`
- **Background gradient**: Diagonal from colored accent (20-22 alpha) to dark base (55 alpha)
- **Hover state**: Changes all borders to `rgba(255, 255, 255, 18)` and lightens gradient
- **Selected state**: Cyan accent border and background
- **12 color "stains"**: slate, cyan, emerald, violet, rose, amber, blue, teal, lime, fuchsia, indigo, orange

### UI Component Conventions
1. **Consistent transparency**: All backgrounds use rgba with alpha for layering
2. **Hover feedback**: Subtle cyan accent on interactive elements
3. **Focus rings**: Brighter cyan border on keyboard focus
4. **Disabled states**: Reduced opacity (90-130 alpha) and muted borders
5. **Square aesthetics**: Zero border-radius throughout
6. **Scrollbar styling**: Minimal, square, cyan accent on hover
7. **Tab system**: Emerald gradient for selected tabs, square corners

### Color Stains (Task Categories)
Full palette with RGB values:
- slate: `rgba(148, 163, 184, 110)`
- cyan: `rgba(56, 189, 248, 130)`
- emerald: `rgba(16, 185, 129, 125)`
- violet: `rgba(139, 92, 246, 125)`
- rose: `rgba(244, 63, 94, 125)`
- amber: `rgba(245, 158, 11, 125)`
- blue: `rgba(59, 130, 246, 125)`
- teal: `rgba(20, 184, 166, 125)`
- lime: `rgba(132, 204, 22, 125)`
- fuchsia: `rgba(217, 70, 239, 125)`
- indigo: `rgba(99, 102, 241, 125)`
- orange: `rgba(249, 115, 22, 125)`

## Implementation Plan

### Patterns to Adopt

1. **Card-based layout from Big-AGI**
   - Use Qt QFrame/QWidget as card containers
   - Vertical list with consistent spacing (16-24px gaps)
   - Card structure: header (title + date) + body (description/excerpt) + optional image
   - Initial display: 5-10 items, lazy load more on scroll/click

2. **Styling from Agents-Runner**
   - **Colors**: Dark theme with `rgba(18, 20, 28, *)` backgrounds
   - **Text**: `#EDEFF5` primary, `Inter` font at 13px
   - **Accent**: Cyan `rgba(56, 189, 248, *)` for hover/focus
   - **Borders**: `0px border-radius`, 1px rgba borders
   - **Spacing**: 8-12px internal padding, 6-8px for compact elements

3. **Hybrid card design**
   - Base: Transparent with subtle border and gradient (like TaskRow)
   - Left accent: 4px colored border (use category/date-based colors)
   - Hover: Cyan accent border shift
   - Layout: Flexbox column with title row, body text, optional footer

### Styling Approach (Qt Implementation)

```python
# Card widget QSS
QWidget#BlogPostCard {
    background-color: qlineargradient(
        x1: 0, y1: 0, x2: 1, y2: 1,
        stop: 0 rgba(56, 189, 248, 18),
        stop: 1 rgba(18, 20, 28, 55)
    );
    border: 1px solid rgba(255, 255, 255, 12);
    border-left: 4px solid rgba(56, 189, 248, 130);
    border-radius: 0px;
    padding: 16px;
    margin-bottom: 16px;
}

QWidget#BlogPostCard:hover {
    border: 1px solid rgba(255, 255, 255, 18);
    background-color: qlineargradient(
        x1: 0, y1: 0, x2: 1, y2: 1,
        stop: 0 rgba(255, 255, 255, 14),
        stop: 1 rgba(18, 20, 28, 65)
    );
}
```

### Layout Structure

```
BlogListWidget (QScrollArea)
├── BlogListContainer (QWidget)
│   ├── BlogPostCard (QFrame)
│   │   ├── HeaderRow (QHBoxLayout)
│   │   │   ├── TitleLabel (QLabel) - level: title-sm
│   │   │   └── DateLabel (QLabel) - level: body-sm, aligned right
│   │   ├── BodyLabel (QLabel) - level: body-sm, word wrap
│   │   └── [Optional] ReadMoreButton (QPushButton)
│   ├── BlogPostCard (QFrame) - repeat...
│   └── LoadMoreButton (QPushButton)
```

### Specific Values for Blog Cards

- **Card padding**: `16px` (consistent with Agents-Runner button spacing scaled up)
- **Card margin-bottom**: `16px` (based on Big-AGI mb:3 → 24px, scaled to 16px)
- **Title font-weight**: `650` (semi-bold, matching Agents-Runner headers)
- **Body font-size**: `13px` (matching Agents-Runner base)
- **Accent colors**: Rotate through stain palette or use date-based color
- **Container max-width**: `800px` (between Big-AGI's sm:600px and typical blog width)
- **Container padding**: `24px` on desktop, `16px` on mobile (if responsive)

### Responsive Considerations (Future)

While Qt desktop app may not need full responsiveness:
- Content width: Cap at 800px with centered alignment
- Scrollable vertical list
- Adjust font sizes if window < 1024px width
- Consider collapsing long bodies to 2-3 lines with "Read more"

## Technical Decisions

1. **Use existing Agents-Runner style system**: Extend `template_base.py` with blog-specific styles
2. **Square corners**: Honor `0px border-radius` policy throughout
3. **Color stains**: Reuse existing palette for post categories or date-based coloring
4. **Qt widgets**: Use QFrame for cards, QVBoxLayout for list, QScrollArea for container
5. **Style tokens**: Add blog-specific tokens to `palette.py` and `metrics.py` if needed
6. **Font consistency**: Keep Inter 13px base, scale up to 14-15px for titles
7. **Gradients**: Leverage QLinearGradient with rgba colors like TaskRow

## Next Steps

1. ✅ Document UI patterns (this file)
2. Create blog data model (post title, date, body, category, link)
3. Implement BlogPostCard widget with QSS styling
4. Implement BlogListWidget with scroll and load-more
5. Integrate with main UI (new tab or dialog)
6. Wire up data source (JSON/API/RSS feed)
7. Test with sample blog posts
8. Polish interactions and accessibility

## References

- Big-AGI source: `/tmp/big-AGI/src/apps/news/`
- Agents-Runner style: `/tmp/Agents-Runner/agents_runner/style/`
- MUI Joy docs: https://mui.com/joy-ui/
- Qt Style Sheets: https://doc.qt.io/qt-6/stylesheet-reference.html
