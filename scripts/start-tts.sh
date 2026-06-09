#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TTS_DIR="${REPO_ROOT}/tts"
TTS_HOST="127.0.0.1"
TTS_PORT="8888"
TTS_LOG="/tmp/tts-server.log"
TTS_PID_FILE="/tmp/tts-server.pid"
STARTUP_TIMEOUT_SECONDS="${TTS_STARTUP_TIMEOUT_SECONDS:-180}"

is_tts_listening() {
  ss -ltn 2>/dev/null | grep -q ":${TTS_PORT} "
}

pid_is_alive() {
  local pid="$1"
  [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1
}

read_pid_file() {
  [[ -f "${TTS_PID_FILE}" ]] || return 1

  local pid
  pid="$(tr -d '[:space:]' < "${TTS_PID_FILE}")"

  [[ "${pid}" =~ ^[0-9]+$ ]] || return 1
  printf '%s\n' "${pid}"
}

wait_for_startup() {
  local pid="$1"
  local waited=0

  while (( waited < STARTUP_TIMEOUT_SECONDS )); do
    if is_tts_listening; then
      return 0
    fi

    if ! pid_is_alive "${pid}"; then
      return 1
    fi

    sleep 1
    waited=$((waited + 1))
  done

  return 1
}

start_tts() {
  if is_tts_listening; then
    echo "TTS already listening on ${TTS_HOST}:${TTS_PORT}"
    return 0
  fi

  if existing_pid="$(read_pid_file 2>/dev/null)"; then
    if pid_is_alive "${existing_pid}"; then
      if wait_for_startup "${existing_pid}"; then
        echo "TTS already running with PID ${existing_pid}"
        return 0
      fi

      echo "Existing TTS process ${existing_pid} is not becoming ready" >&2
      return 1
    fi

    rm -f "${TTS_PID_FILE}"
  fi

  if [[ ! -x "${TTS_DIR}/.venv/bin/uvicorn" ]]; then
    echo "TTS launcher missing executable: ${TTS_DIR}/.venv/bin/uvicorn" >&2
    echo "Run the setup step that prepares the TTS virtualenv first." >&2
    return 1
  fi

  (
    cd "${TTS_DIR}"
    nohup "${TTS_DIR}/.venv/bin/uvicorn" server:app --host "${TTS_HOST}" --port "${TTS_PORT}" \
      >>"${TTS_LOG}" 2>&1 &
    echo $! > "${TTS_PID_FILE}"
  )

  local started_pid
  started_pid="$(read_pid_file)"

  if wait_for_startup "${started_pid}"; then
    echo "TTS started with PID ${started_pid}"
    return 0
  fi

  echo "TTS failed to start; tail ${TTS_LOG} for details." >&2
  return 1
}

status_tts() {
  if is_tts_listening; then
    if pid="$(read_pid_file 2>/dev/null)"; then
      echo "TTS listening on ${TTS_HOST}:${TTS_PORT} (PID ${pid})"
    else
      echo "TTS listening on ${TTS_HOST}:${TTS_PORT}"
    fi
    return 0
  fi

  echo "TTS is not listening on ${TTS_HOST}:${TTS_PORT}" >&2
  return 1
}

case "${1:-start}" in
  start)
    start_tts
    ;;
  status)
    status_tts
    ;;
  *)
    echo "Usage: $0 [start|status]" >&2
    exit 1
    ;;
esac
