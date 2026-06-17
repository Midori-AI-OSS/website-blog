'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_ART_PALETTE,
  type ExtractedPalette,
  extractPaletteFromImage,
  hexToRgb,
} from '@/lib/theme/artPalette';
import { toDarkMediumBackdropPalette } from '@/lib/theme/dynamicBackdrop';

interface PasswordGateProps {
  password: string;
  hint?: string;
  coverImageUrl?: string;
  children: React.ReactNode;
}

function toRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
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

  const tintStyles = useMemo(() => {
    if (!coverImageUrl) return null;

    const darkPalette = toDarkMediumBackdropPalette(palette);
    const borderColor = toRgba(darkPalette.secondary, 0.65);
    const backgroundGradient = `linear-gradient(120deg, rgba(4, 5, 9, 0.94) 0%, ${toRgba(darkPalette.primary, 0.42)} 42%, rgba(4, 5, 9, 0.9) 100%)`;
    const decorativeOverlay = `linear-gradient(to right, rgba(4, 5, 9, 0.97) 0%, ${toRgba(darkPalette.secondary, 0.72)} 30%, rgba(4, 5, 9, 0.06) 74%)`;

    return {
      borderColor,
      backgroundGradient,
      decorativeOverlay,
      primaryColor: palette.primary,
    };
  }, [coverImageUrl, palette]);

  const primary = tintStyles?.primaryColor ?? '#a78bfa';

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
    <div
      className="relative w-full overflow-hidden px-4 py-4"
      style={{
        backgroundColor: coverImageUrl ? 'rgba(4, 5, 9, 0.94)' : 'rgba(19, 10, 30, 0.4)',
        backgroundImage: tintStyles?.backgroundGradient,
        border: '1px solid',
        borderColor: tintStyles?.borderColor ?? 'rgba(255,255,255,0.10)',
      }}
    >
      {coverImageUrl && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '45%',
            pointerEvents: 'none',
            backgroundImage: `url(${coverImageUrl})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundPosition: 'right 22%',
            transform: 'scale(0.96)',
            transformOrigin: 'center right',
            opacity: 0.42,
            filter: 'blur(1.6px) saturate(1.08) contrast(1.06)',
            clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 35% 100%)',
          }}
        />
      )}

      {coverImageUrl && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: tintStyles?.decorativeOverlay,
            pointerEvents: 'none',
          }}
        />
      )}

      <form
        className="relative z-[1] flex w-full flex-wrap items-center justify-center gap-2"
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
          className="min-w-0 max-w-[240px] flex-1 border bg-black/30 px-3 py-2 text-base text-slate-100 outline-none placeholder:text-slate-500"
          placeholder="Enter password"
          style={{
            fontSize: '1rem',
            borderColor: hasError ? '#fda4af' : `${primary}40`,
          }}
        />

        <span className="select-none text-sm" aria-hidden="true" style={{ color: `${primary}66` }}>
          ::
        </span>

        <button
          type="submit"
          className="inline-flex h-9 shrink-0 items-center justify-center border px-5 font-semibold text-sm transition"
          style={{
            borderColor: `${primary}50`,
            backgroundColor: `${primary}18`,
            color: primary,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${primary}28`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = `${primary}18`;
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = `2px solid ${primary}40`;
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
              aria-hidden="true"
              style={{ color: `${primary}66` }}
            >
              ::
            </span>

            <span className="text-sm italic" style={{ color: `${primary}99` }}>
              {hint}
            </span>
          </>
        )}
      </form>

      {hasError && (
        <p
          id="password-gate-error"
          role="alert"
          className="relative z-[1] mt-2 text-center text-sm"
          style={{ color: '#fda4af' }}
        >
          Incorrect password.
        </p>
      )}
    </div>
  );
}
