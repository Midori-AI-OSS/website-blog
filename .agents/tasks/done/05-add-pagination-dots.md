# Task: Add Pagination Dots UI

## Objective
Add a pagination dots row below each game's post list in the lore page. The dots let users navigate between pages of posts within a game section.

## File to modify
`app/lore/LoreListPageClient.tsx`

## Preconditions
Task 04 (`add-page-size-selector-and-state`) must be completed first. This task depends on:
- `group.currentPage` (1-indexed number)
- `group.totalPages` (number)
- `group.pageSize` (number | Infinity)
- `setCurrentPageByGame` setter
- `group.game.slug`

## What to do

### 1. Create a pagination dots renderer
Below each game's post list mapping and above the closing `</Box>` of the game section, add the pagination dots. Only render when pagination is active:

```tsx
{group.totalPages > 1 && group.pageSize !== Infinity && (
  <Stack
    direction="row"
    spacing={0.75}
    alignItems="center"
    justifyContent="center"
    sx={{ mt: 2 }}
  >
    {/* left arrow */}
    <Box
      component="button"
      onClick={() => {
        if (group.currentPage > 1) {
          setCurrentPageByGame((current) => ({
            ...current,
            [group.game.slug]: group.currentPage - 1,
          }));
        }
      }}
      disabled={group.currentPage <= 1}
      aria-label="Previous page"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        border: 'none',
        bgcolor: 'transparent',
        color: group.currentPage <= 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)',
        cursor: group.currentPage <= 1 ? 'default' : 'pointer',
        borderRadius: 0,
        fontSize: '1.2rem',
        lineHeight: 1,
        '&:hover': group.currentPage > 1 ? { color: '#8b5cf6' } : {},
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: '#8b5cf6',
          outlineOffset: '2px',
        },
      }}
    >
      &#8592;
    </Box>

    {/* page dots */}
    <Stack direction="row" spacing={0.75} alignItems="center">
      {Array.from({ length: group.totalPages }, (_, i) => {
        const pageNum = i + 1;
        const isActive = pageNum === group.currentPage;
        return (
          <Box
            key={pageNum}
            component="button"
            onClick={() => {
              setCurrentPageByGame((current) => ({
                ...current,
                [group.game.slug]: pageNum,
              }));
            }}
            aria-label={`Page ${pageNum}`}
            aria-current={isActive ? 'page' : undefined}
            sx={{
              border: 'none',
              bgcolor: isActive ? '#8b5cf6' : 'rgba(255,255,255,0.2)',
              borderRadius: isActive ? '4px' : '50%',
              width: isActive ? 24 : 8,
              height: 8,
              cursor: 'pointer',
              p: 0,
              m: 0,
              transition: 'width 0.2s ease, background-color 0.2s ease',
              '&:hover': {
                bgcolor: isActive ? '#9b6dff' : 'rgba(255,255,255,0.4)',
              },
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: '#8b5cf6',
                outlineOffset: '2px',
              },
            }}
          />
        );
      })}
    </Stack>

    {/* right arrow */}
    <Box
      component="button"
      onClick={() => {
        if (group.currentPage < group.totalPages) {
          setCurrentPageByGame((current) => ({
            ...current,
            [group.game.slug]: group.currentPage + 1,
          }));
        }
      }}
      disabled={group.currentPage >= group.totalPages}
      aria-label="Next page"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        border: 'none',
        bgcolor: 'transparent',
        color: group.currentPage >= group.totalPages ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)',
        cursor: group.currentPage >= group.totalPages ? 'default' : 'pointer',
        borderRadius: 0,
        fontSize: '1.2rem',
        lineHeight: 1,
        '&:hover': group.currentPage < group.totalPages ? { color: '#8b5cf6' } : {},
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: '#8b5cf6',
          outlineOffset: '2px',
        },
      }}
    >
      &#8594;
    </Box>
  </Stack>
)}
```

### 2. Positioning
Place this block right after the post list mapping loop's closing `</Stack>` (the one with `spacing={1.25}` that wraps the post cards) and before the game section's closing `</Box>`.

### Notes
- Use `<Box component="button">` for semantic button behavior without importing MUI Button (keeps it lightweight)
- Purple `#8b5cf6` for the active page indicator — matches the project primary color
- Inactive dots are circular (`borderRadius: '50%'`), active dot is a longer pill (`borderRadius: '4px', width: 24`)
- Arrow characters: `←` (`&#8592;`) and `→` (`&#8594;`)
- No dependency on lucide-react for icons — use HTML entities
- No Text/Typography needed in buttons — just raw characters

## Verification
- Pagination dots appear only when totalPages > 1 and page size is not "All"
- Left arrow is disabled (dimmed) on page 1
- Right arrow is disabled (dimmed) on the last page
- Clicking a dot jumps to that page
- Active page dot is wider and purple
- Inactive dots are small grey circles
- Hover effects work on arrows and dots
- Focus-visible rings appear for keyboard navigation
