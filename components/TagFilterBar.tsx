'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Chip from '@mui/joy/Chip';
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

  const handleKeyDown = (event: React.KeyboardEvent, callback: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  };

  return (
    <Box
      role="region"
      aria-label="Tag filter"
      sx={{
        width: '100%',
        py: 2,
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography
          level="body-sm"
          sx={{
            color: 'text.secondary',
            fontWeight: 500,
            mr: 0.5,
          }}
        >
          Filter:
        </Typography>

        <Chip
          variant={isAllSelected ? 'solid' : 'outlined'}
          color={isAllSelected ? 'primary' : 'neutral'}
          size="sm"
          onClick={handleAllClick}
          onKeyDown={(e) => handleKeyDown(e, handleAllClick)}
          tabIndex={0}
          role="button"
          aria-pressed={isAllSelected}
          aria-label="Show all tags"
          sx={{
            '--Chip-radius': '4px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: isAllSelected ? 'primary.600' : 'neutral.softHoverBg',
            },
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.500',
              outlineOffset: '2px',
            },
          }}
        >
          All
        </Chip>

        {allTags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <Chip
              key={tag}
              variant={isSelected ? 'soft' : 'outlined'}
              color={isSelected ? 'primary' : 'neutral'}
              size="sm"
              onClick={() => handleTagClick(tag)}
              onKeyDown={(e) => handleKeyDown(e, () => handleTagClick(tag))}
              tabIndex={0}
              role="button"
              aria-pressed={isSelected}
              aria-label={`Filter by ${tag}`}
              sx={{
                '--Chip-radius': '4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: isSelected ? 'primary.softHoverBg' : 'neutral.softHoverBg',
                },
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.500',
                  outlineOffset: '2px',
                },
              }}
            >
              {tag}
            </Chip>
          );
        })}
      </Stack>
    </Box>
  );
});

TagFilterBar.displayName = 'TagFilterBar';
