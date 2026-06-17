'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_ART_PALETTE,
  type ExtractedPalette,
  extractPaletteFromImage,
} from '@/lib/theme/artPalette';

interface PasswordGateProps {
  password: string;
  hint?: string;
  coverImageUrl?: string;
  children: React.ReactNode;
}

export default function PasswordGate({
  password,
  hint,
  coverImageUrl,
  children,
}: PasswordGateProps) {
  const [value, setValue] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [palette, setPalette] = useState<ExtractedPalette>(DEFAULT_ART_PALETTE);

  useEffect(() => {
    if (!coverImageUrl) return;

    let active = true;

    const syncPalette = async () => {
      const extracted = await extractPaletteFromImage(coverImageUrl, {
        fallback: DEFAULT_ART_PALETTE,
      });
      if (!active) return;
      setPalette(extracted);
    };

    void syncPalette();

    return () => {
      active = false;
    };
  }, [coverImageUrl]);

  const primaryColor = palette.primary;

  const colorStyles = useMemo(
    () => ({
      borderColor: `${primaryColor}55`,
      focusBorderColor: primaryColor,
      focusRingColor: `${primaryColor}40`,
      buttonBg: `${primaryColor}15`,
      buttonHoverBg: `${primaryColor}25`,
      buttonBorderColor: `${primaryColor}35`,
      buttonTextColor: primaryColor,
      separatorColor: `${primaryColor}30`,
      errorColor: '#fda4af',
    }),
    [primaryColor],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (value === password) {
      setUnlocked(true);
      setHasError(false);
      return;
    }

    setHasError(true);
    setFailedAttempts((n) => n + 1);
  };

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="w-full">
      <form
        className="flex w-full flex-wrap items-center gap-2 border px-3 py-2"
        style={{
          borderColor: hasError ? colorStyles.errorColor : colorStyles.borderColor,
          backgroundColor: 'rgba(19, 10, 30, 0.4)',
          backdropFilter: 'blur(8px)',
          transition: 'border-color 0.2s ease',
        }}
        onSubmit={handleSubmit}
      >
        <input
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
          aria-invalid={hasError}
          aria-describedby={hasError ? 'password-gate-error' : undefined}
          className="min-w-0 flex-1 border-none bg-transparent px-1 py-1 text-base text-slate-100 outline-none placeholder:text-slate-500"
          placeholder="Enter password"
          style={{ fontSize: '1rem' }}
        />

        <span
          className="select-none text-sm"
          style={{ color: colorStyles.separatorColor }}
          aria-hidden="true"
        >
          ::
        </span>

        <button
          type="submit"
          className="inline-flex h-9 shrink-0 items-center justify-center border px-4 font-semibold text-sm transition focus:outline-none"
          style={{
            borderColor: colorStyles.buttonBorderColor,
            backgroundColor: colorStyles.buttonBg,
            color: colorStyles.buttonTextColor,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colorStyles.buttonHoverBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = colorStyles.buttonBg;
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = `2px solid ${colorStyles.focusRingColor}`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          Enter
        </button>

        {hint && failedAttempts >= 3 && (
          <>
            <span
              className="select-none text-sm"
              style={{ color: colorStyles.separatorColor }}
              aria-hidden="true"
            >
              ::
            </span>

            <span className="text-sm italic" style={{ color: `${primaryColor}99` }}>
              {hint}
            </span>
          </>
        )}
      </form>

      {hasError && (
        <p
          id="password-gate-error"
          role="alert"
          className="mt-1.5 text-sm"
          style={{ color: colorStyles.errorColor }}
        >
          Incorrect password.
        </p>
      )}
    </div>
  );
}
