#!/usr/bin/env bash
set -euo pipefail

if ! command -v yay >/dev/null 2>&1; then
  exit 1
fi

if ! command -v bun >/dev/null 2>&1; then
  exit 1
fi

PLAYWRIGHT_SYSTEM_PACKAGES=(
  nspr
  nss
  atk
  at-spi2-core
  libxcomposite
)

yay -Syu --noconfirm --needed "${PLAYWRIGHT_SYSTEM_PACKAGES[@]}"

bun install

bunx playwright install chromium

PLAYWRIGHT_CHROME="$(find "${HOME}/.cache/ms-playwright" -type f -path '*/chrome-linux64/chrome' | sort | tail -n 1)"

if [[ -z "${PLAYWRIGHT_CHROME}" ]]; then
  exit 1
fi

sudo mkdir -p /opt/google/chrome
sudo ln -sf "${PLAYWRIGHT_CHROME}" /opt/google/chrome/chrome

if [[ "${MIDORI_AI_AGENTS_RUNNER_INTERACTIVE:-false}" == "true" ]]; then
  DEV_LOG="/tmp/workspace-dev.log"

  if ss -ltn 2>/dev/null | grep -q ':3000 '; then
    exit 0
  else
    nohup bun run dev >"${DEV_LOG}" 2>&1 &
  fi
fi
