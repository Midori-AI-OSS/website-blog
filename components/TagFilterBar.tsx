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
  const mobileTagPanelId = React.useId();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

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

  const getTagButtonSx = (isSelected: boolean, fullWidth: boolean) => ({
    ...buttonBaseSx,
    width: fullWidth ? '100%' : { xs: '100%', sm: 'auto' },
    bgcolor: isSelected ? 'primary.softBg' : 'transparent',
    borderColor: isSelected ? 'primary.400' : 'rgba(255,255,255,0.16)',
    color: isSelected ? 'primary.100' : 'text.primary',
    fontWeight: isSelected ? 700 : 600,
    '&:hover': {
      bgcolor: isSelected ? 'primary.softHoverBg' : 'background.level2',
      borderColor: isSelected ? 'primary.500' : 'primary.400',
    },
  });

  const menuLineSx = {
    display: 'block',
    width: '100%',
    height: '2px',
    borderRadius: 999,
    bgcolor: 'currentColor',
  } as const;

  const handleAllClick = () => {
    onChange([]);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((current) => !current);
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
            display: { xs: 'flex', sm: 'none' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              minWidth: 0,
            }}
          >
            <Typography
              level="body-xs"
              sx={{
                color: 'text.tertiary',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              Filters:
            </Typography>

            <Button
              type="button"
              variant={isAllSelected ? 'soft' : 'outlined'}
              color={isAllSelected ? 'primary' : 'neutral'}
              onClick={handleAllClick}
              aria-pressed={isAllSelected}
              aria-label="Show all tags"
              sx={{
                ...getTagButtonSx(isAllSelected, false),
                px: 1.25,
                whiteSpace: 'nowrap',
                width: 'auto',
                flex: '0 0 auto',
              }}
            >
              All
            </Button>
          </Box>

          <Button
            type="button"
            variant={isMobileMenuOpen ? 'soft' : 'outlined'}
            color="neutral"
            onClick={toggleMobileMenu}
            aria-expanded={isMobileMenuOpen}
            aria-controls={mobileTagPanelId}
            aria-label={isMobileMenuOpen ? 'Hide tags' : 'Show tags'}
            sx={{
              minWidth: 44,
              minHeight: 44,
              px: 0,
              borderRadius: 0,
              borderColor: 'rgba(255,255,255,0.16)',
              bgcolor: isMobileMenuOpen ? 'neutral.softBg' : 'transparent',
              color: 'text.primary',
              flex: '0 0 auto',
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.500',
                outlineOffset: '2px',
              },
            }}
          >
            <Box
              aria-hidden="true"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '3px',
                width: 18,
                height: 18,
              }}
            >
              <Box sx={menuLineSx} />
              <Box sx={menuLineSx} />
              <Box sx={menuLineSx} />
            </Box>
          </Button>
        </Box>

        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
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
            display: { xs: 'none', sm: 'flex' },
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
              ...getTagButtonSx(isAllSelected, false),
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
                  ...getTagButtonSx(isSelected, false),
                }}
              >
                {tag}
              </Button>
            );
          })}
        </Box>

        {isMobileMenuOpen ? (
          <Box
            id={mobileTagPanelId}
            sx={{
              display: { xs: 'grid', sm: 'none' },
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))' },
              gap: 0.75,
              maxHeight: '50vh',
              overflowY: 'auto',
              pr: 0.25,
            }}
          >
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
                    ...getTagButtonSx(isSelected, true),
                  }}
                >
                  {tag}
                </Button>
              );
            })}
          </Box>
        ) : null}
      </Stack>
    </Sheet>
  );
});

TagFilterBar.displayName = 'TagFilterBar';
