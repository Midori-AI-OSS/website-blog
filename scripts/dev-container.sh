#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd -P)"
CONTAINER_NAME="website-blog-dev"
IMAGE_NAME="website-blog-dev:local"
COMPOSE_FILE="${REPO_ROOT}/docker-compose.dev.yaml"
LOCK_FILE="/tmp/agents-artifacts/website-blog-dev.lock"

fail() {
  printf 'dev-container: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'USAGE'
Usage: scripts/dev-container.sh {start|restart|exec COMMAND [ARG...]|shell|status|stop}

start    Reuse the running container, or clean stale node_modules and start fresh.
restart  Stop the owned container, clean node_modules, and start fresh.
exec     Start if needed, then execute COMMAND in /app (exit status preserved).
shell    Start if needed, then open Bash in /app.
status   Report state without starting or cleaning anything.
stop     Stop only the owned development container.

Fresh starts rebuild node_modules through an explicit bun install afterward.
The container has a one-CPU quota and stops after 12 hours, including active work.
USAGE
}

compose() {
  docker compose --project-name website-blog-agent-dev --file "$COMPOSE_FILE" "$@"
}

container_exists() {
  local name
  name="$(docker ps -a --filter "name=^/${CONTAINER_NAME}$" --format '{{.Names}}')" \
    || fail 'Cannot inspect Docker containers.'
  [[ "$name" == "$CONTAINER_NAME" ]]
}

inspect() {
  docker container inspect --format "$1" "$CONTAINER_NAME" \
    || fail "Cannot inspect ${CONTAINER_NAME}."
}

validate_container() {
  [[ "$(inspect '{{index .Config.Labels "dev.website-blog.managed"}}')" == true ]] \
    || fail "${CONTAINER_NAME} belongs to something else; leaving it untouched."
  [[ "$(inspect '{{index .Config.Labels "dev.website-blog.checkout"}}')" == "$REPO_ROOT" ]] \
    || fail "${CONTAINER_NAME} belongs to another checkout; leaving it untouched."
  local mount
  mount="$(inspect '{{range .Mounts}}{{if eq .Destination "/app"}}{{.Type}}{{"\t"}}{{.Source}}{{"\t"}}{{.RW}}{{end}}{{end}}')"
  [[ "$mount" == $'bind\t'"${REPO_ROOT}"$'\ttrue' ]] \
    || fail "${CONTAINER_NAME} has an unexpected /app mount; leaving it untouched."
  [[ "$(inspect '{{.HostConfig.NanoCpus}}')" == 1000000000 ]] \
    || fail "${CONTAINER_NAME} does not have the required one-CPU quota; leaving it untouched."
  local lifecycle environment setting
  lifecycle="$(inspect '{{.HostConfig.RestartPolicy.Name}}|{{.HostConfig.Init}}|{{.Config.WorkingDir}}|{{.Config.User}}|{{json .Config.Cmd}}')"
  [[ "$lifecycle" == "no|true|/app|${DEV_UID}:${DEV_GID}|"'["/usr/bin/bash","-c","exec sleep 43200"]' ]] \
    || fail "${CONTAINER_NAME} has unexpected lifetime, restart, user, or working-directory settings; leaving it untouched."
  environment="$(inspect '{{range .Config.Env}}{{println .}}{{end}}')"
  for setting in \
    UV_PROJECT_ENVIRONMENT=/tmp/website-blog-venv \
    UV_CACHE_DIR=/tmp/uv-cache \
    UV_PYTHON_INSTALL_DIR=/tmp/uv-python \
    BUN_INSTALL_CACHE_DIR=/tmp/bun-cache \
    BUN_RUNTIME_TRANSPILER_CACHE_PATH=/tmp/bun-transpiler-cache \
    HF_HOME=/tmp/huggingface; do
    case $'\n'"$environment"$'\n' in
      *$'\n'"$setting"$'\n'*) ;;
      *) fail "${CONTAINER_NAME} has an unexpected ${setting%%=*} setting; leaving it untouched." ;;
    esac
  done
}

protect_other_containers() {
  local ids id sources source
  ids="$(docker ps -q)" || fail 'Cannot check running containers before cleanup.'
  while IFS= read -r id; do
    [[ -n "$id" ]] || continue
    sources="$(docker container inspect --format '{{range .Mounts}}{{if eq .Type "bind"}}{{println .Source}}{{end}}{{end}}' "$id")" \
      || fail "Cannot inspect running container ${id}; refusing cleanup."
    while IFS= read -r source; do
      [[ -n "$source" ]] || continue
      source="$(realpath -m -- "$source")" || fail 'Cannot resolve a running container mount.'
      if [[ "$source" == "$REPO_ROOT" || "$source" == "$REPO_ROOT/"* \
        || "$REPO_ROOT" == "${source%/}/"* ]]; then
        fail "Running container ${id} shares this checkout. Stop it before cleaning node_modules."
      fi
    done <<< "$sources"
  done <<< "$ids"
}

clean_modules() {
  local modules="${REPO_ROOT}/node_modules"
  if [[ -L "$modules" ]]; then
    rm -- "$modules" || fail "Cannot unlink ${modules}; refusing startup."
  else
    rm -rf -- "$modules" || fail "Cannot remove ${modules}; refusing startup. Check its permissions."
  fi
  [[ ! -e "$modules" && ! -L "$modules" ]] || fail 'node_modules still exists; refusing startup.'
}

start_container() {
  if container_exists; then
    validate_container
    case "$(inspect '{{.State.Status}}')" in
      running)
        printf '%s is ready (reusing the running container).\n' "$CONTAINER_NAME"
        return
        ;;
      exited|created|dead) ;;
      *) fail "${CONTAINER_NAME} is paused or restarting; resolve its state before starting." ;;
    esac
  fi

  protect_other_containers
  if ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
    compose build dev || fail 'Development image build failed; node_modules was not cleaned.'
  fi
  # Recheck after a potentially long image build, before any destructive cleanup.
  protect_other_containers
  if container_exists; then
    validate_container
    docker container rm "$CONTAINER_NAME" || fail 'Cannot remove the stopped development container.'
  fi
  clean_modules
  compose up --detach --no-build dev || fail 'Development container startup failed.'
  validate_container
  [[ "$(inspect '{{.State.Status}}')" == running ]] || fail 'Development container did not remain running.'
  printf '%s is ready (fresh container; install project dependencies before use).\n' "$CONTAINER_NAME"
}

stop_container() {
  if container_exists; then
    validate_container
    docker container stop "$CONTAINER_NAME"
  else
    printf '%s does not exist.\n' "$CONTAINER_NAME"
  fi
}

mode="${1:-help}"
[[ $# -eq 0 ]] || shift
case "$mode" in
  help|-h|--help) usage; exit 0 ;;
  exec) [[ $# -gt 0 ]] || { usage >&2; exit 2; } ;;
  start|restart|shell|status|stop)
    [[ $# -eq 0 ]] || { usage >&2; exit 2; }
    ;;
  *) usage >&2; exit 2 ;;
esac

[[ "$(git -C "$REPO_ROOT" rev-parse --show-toplevel)" == "$REPO_ROOT" ]] \
  || fail 'The helper must live in the root checkout scripts directory.'
[[ -f "$COMPOSE_FILE" ]] || fail "Missing ${COMPOSE_FILE}."
command -v docker >/dev/null || fail 'Docker is required.'
command -v flock >/dev/null || fail 'flock (util-linux) is required.'
docker info --format '{{.ServerVersion}}' >/dev/null || fail 'Docker is unavailable; no files were cleaned.'

export DEV_REPO_ROOT="$REPO_ROOT"
export DEV_UID="$(id -u)"
export DEV_GID="$(id -g)"

if [[ "$mode" == status ]]; then
  if container_exists; then
    validate_container
    printf '%s: %s\n' "$CONTAINER_NAME" "$(inspect '{{.State.Status}}')"
  else
    printf '%s: not created\n' "$CONTAINER_NAME"
  fi
  exit 0
fi

mkdir -p -- "$(dirname -- "$LOCK_FILE")"
exec 9>"$LOCK_FILE"
flock 9
case "$mode" in
  stop) stop_container ;;
  restart) stop_container; start_container ;;
  start|exec|shell) start_container ;;
esac
flock -u 9
exec 9>&-

if [[ "$mode" == exec || "$mode" == shell ]]; then
  docker_args=(exec --interactive --workdir /app)
  if [[ -t 0 && -t 1 ]]; then
    docker_args+=(--tty)
  fi
  [[ "$mode" != shell ]] || set -- /usr/bin/bash
  exec docker "${docker_args[@]}" "$CONTAINER_NAME" "$@"
fi
