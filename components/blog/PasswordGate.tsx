'use client';

import type React from 'react';
import { useState } from 'react';

export default function PasswordGate({
  password,
  children,
}: {
  password: string;
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

  return (
    <div className="w-full max-w-md border border-white/10 bg-[#130a1e]/80 p-4 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label htmlFor="password-gate" className="block font-medium text-slate-300 text-sm">
            Password
          </label>
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
            className="h-11 w-full border border-white/10 bg-black/30 px-3 text-base text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30"
            placeholder="Enter password"
          />
        </div>

        {hasError && (
          <p id="password-gate-error" role="alert" className="text-rose-300 text-sm">
            Incorrect password.
          </p>
        )}

        <button
          type="submit"
          className="inline-flex h-11 w-full items-center justify-center border border-violet-400/30 bg-violet-500/10 px-4 font-semibold text-sm text-violet-100 transition hover:bg-violet-500/20 focus:outline-none focus:ring-2 focus:ring-violet-400/40"
        >
          Unlock
        </button>
      </form>
    </div>
  );
}
