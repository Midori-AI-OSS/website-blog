'use client';

import { Box, Button, Input, Stack, Typography } from '@mui/joy';
import type React from 'react';
import { useState } from 'react';

export default function PasswordGate({
  password,
  hint,
  primaryColor,
  children,
}: {
  password: string;
  hint?: string;
  primaryColor?: string | null;
  children: React.ReactNode;
}) {
  const [value, setValue] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (value === password) {
      setUnlocked(true);
      setHasError(false);
      return;
    }
    setHasError(true);
  };

  if (unlocked) {
    return <>{children}</>;
  }

  const accent = primaryColor ?? 'var(--joy-palette-primary-500)';

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        width: '100%',
        mb: 4,
        bgcolor: 'rgba(19, 10, 30, 0.4)',
        backdropFilter: 'blur(12px)',
        border: '1px solid',
        borderColor: 'rgba(255,255,255,0.08)',
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 2.5 },
      }}
    >
      {hint && (
        <Typography
          level="body-sm"
          sx={{
            color: 'text.secondary',
            fontStyle: 'italic',
            mb: 1.5,
          }}
        >
          Hint: {hint}
        </Typography>
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1.5, sm: 2 }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        <Typography
          component="label"
          htmlFor="password-gate"
          level="body-md"
          sx={{
            color: 'text.primary',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            minWidth: 'fit-content',
          }}
        >
          Password
        </Typography>

        <Input
          id="password-gate"
          type="password"
          value={value}
          autoComplete="current-password"
          onChange={(event) => {
            setValue(event.target.value);
            if (hasError) {
              setHasError(false);
            }
          }}
          placeholder="Enter password"
          aria-invalid={hasError}
          aria-describedby={hasError ? 'password-gate-error' : undefined}
          sx={{
            flex: 1,
            minHeight: 44,
            fontSize: '1rem',
            borderRadius: 0,
            '&:focus-within': {
              borderColor: accent,
            },
          }}
        />

        <Button
          type="submit"
          variant="solid"
          color="primary"
          sx={{
            minHeight: 44,
            minWidth: { xs: '100%', sm: 100 },
            borderRadius: 0,
            textTransform: 'none',
            fontWeight: 600,
            backgroundColor: `${accent}1a`,
            border: '1px solid',
            borderColor: `${accent}40`,
            color: accent,
            '&:hover': {
              backgroundColor: `${accent}28`,
              borderColor: accent,
            },
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: accent,
              outlineOffset: '2px',
            },
          }}
        >
          Unlock
        </Button>
      </Stack>

      {hasError && (
        <Typography
          id="password-gate-error"
          role="alert"
          level="body-sm"
          sx={{ color: '#fda4af', mt: 1 }}
        >
          Incorrect password.
        </Typography>
      )}
    </Box>
  );
}
