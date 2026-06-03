#!/usr/bin/env bash
set -euo pipefail

cleanup_playwright_profile_locks() {
  local cache_root current_host profile lock_path lock_target lock_pid lock_host

  cache_root="${HOME}/.cache/ms-playwright"
  current_host="$(hostname)"

  [[ -d "${cache_root}" ]] || return 0

  shopt -s nullglob

  for profile in "${cache_root}"/mcp-chrome*; do
    [[ -d "${profile}" ]] || continue

    if command -v pgrep >/dev/null 2>&1 && pgrep -fa -- "${profile}" >/dev/null 2>&1; then
      continue
    fi

    lock_path="${profile}/SingletonLock"
    lock_target=""
    lock_pid=""
    lock_host=""

    if [[ -L "${lock_path}" ]]; then
      lock_target="$(readlink "${lock_path}" || true)"
      lock_pid="${lock_target##*-}"
      lock_host="${lock_target%-${lock_pid}}"

      if [[ "${lock_pid}" =~ ^[0-9]+$ ]] && [[ "${lock_host}" == "${current_host}" ]] && ps -p "${lock_pid}" >/dev/null 2>&1; then
        continue
      fi
    elif [[ ! -e "${profile}/SingletonSocket" && ! -e "${profile}/SingletonCookie" && ! -e "${profile}/Default/LOCK" ]]; then
      continue
    fi

    rm -f \
      "${profile}/SingletonLock" \
      "${profile}/SingletonSocket" \
      "${profile}/SingletonCookie" \
      "${profile}/Default/LOCK"
  done

  shopt -u nullglob
}

run_setup() {
  if ! command -v bun >/dev/null 2>&1; then
    yay -Syu --noconfirm --needed bun
  fi

  PLAYWRIGHT_SYSTEM_PACKAGES=(
    nspr
    nss
    atk
    at-spi2-core
    libxcomposite
  )

  yay -Syu --noconfirm --needed "${PLAYWRIGHT_SYSTEM_PACKAGES[@]}"

  cleanup_playwright_profile_locks

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
}

case "${1:-setup}" in
  setup)
    run_setup
    ;;
  cleanup-playwright-locks)
    cleanup_playwright_profile_locks
    ;;
  *)
    echo "Usage: $0 [setup|cleanup-playwright-locks]" >&2
    exit 1
    ;;
esac
