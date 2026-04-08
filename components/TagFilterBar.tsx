'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Sheet from '@mui/joy/Sheet';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';

export type TagFilterBarProps = {
  allTags: string[];
  selectedTags: string[];
  onChange: (nextSelected: string[]) => void;
};

export const TagFilterBar = React.memo(({ allTags, selectedTags, onChange }: TagFilterBarProps) => {
  // Hide the entire bar when there are no tags
  if (allTags.length === 0) {
    return null;
  }

  const isAllSelected = selectedTags.length === 0;
  const buttonBaseSx = {
    minHeight: 44,
    borderRadius: 0,
    px: { xs: 1, sm: 1.5 },
    py: { xs: 1, sm: 0.75 },
    textTransform: 'none',
    fontWeight: 600,
    letterSpacing: '0.01em',
    whiteSpace: { xs: 'normal', sm: 'nowrap' },
    textAlign: 'center',
    justifyContent: 'center',
    lineHeight: 1.15,
    flex: '0 0 auto',
    transition: 'border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease',
    '&:focus-visible': {
      outline: '2px solid',
      outlineColor: 'primary.500',
      outlineOffset: '2px',
    },
  } as const;

  const handleAllClick = () => {
    onChange([]);
  };

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      // Remove tag from selection
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      // Add tag to selection
      onChange([...selectedTags, tag]);
    }
  };

  return (
    <Sheet
      role="region"
      aria-label="Tag filter"
      variant="outlined"
      sx={{
        width: '100%',
        mb: 2.5,
        px: { xs: 0, sm: 1.5 },
        py: { xs: 1, sm: 1.5 },
        borderRadius: 0,
        borderColor: 'rgba(255,255,255,0.12)',
        bgcolor: 'background.level1',
      }}
    >
      <Stack spacing={1}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Typography
            level="body-xs"
            sx={{
              color: 'text.tertiary',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Filters
          </Typography>
        </Box>

        <Box
          sx={{
            display: { xs: 'grid', sm: 'flex' },
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))' },
            flexWrap: 'wrap',
            gap: 0.75,
          }}
        >
          <Button
            type="button"
            variant={isAllSelected ? 'soft' : 'outlined'}
            color={isAllSelected ? 'primary' : 'neutral'}
            onClick={handleAllClick}
            aria-pressed={isAllSelected}
            aria-label="Show all tags"
            sx={{
              ...buttonBaseSx,
              width: { xs: '100%', sm: 'auto' },
              bgcolor: isAllSelected ? 'primary.softBg' : 'transparent',
              borderColor: isAllSelected ? 'primary.400' : 'rgba(255,255,255,0.16)',
              color: isAllSelected ? 'primary.100' : 'text.primary',
              '&:hover': {
                bgcolor: isAllSelected ? 'primary.softHoverBg' : 'background.level2',
                borderColor: isAllSelected ? 'primary.500' : 'primary.400',
              },
            }}
          >
            All
          </Button>

          {allTags.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <Button
                key={tag}
                type="button"
                variant={isSelected ? 'soft' : 'outlined'}
                color={isSelected ? 'primary' : 'neutral'}
                onClick={() => handleTagClick(tag)}
                aria-pressed={isSelected}
                aria-label={`Filter by ${tag}`}
                sx={{
                  ...buttonBaseSx,
                  width: { xs: '100%', sm: 'auto' },
                  bgcolor: isSelected ? 'primary.softBg' : 'transparent',
                  borderColor: isSelected ? 'primary.400' : 'rgba(255,255,255,0.16)',
                  color: isSelected ? 'primary.100' : 'text.primary',
                  fontWeight: isSelected ? 700 : 600,
                  '&:hover': {
                    bgcolor: isSelected ? 'primary.softHoverBg' : 'background.level2',
                    borderColor: isSelected ? 'primary.500' : 'primary.400',
                  },
                }}
              >
                {tag}
              </Button>
            );
          })}
        </Box>
      </Stack>
    </Sheet>
  );
});

TagFilterBar.displayName = 'TagFilterBar';
