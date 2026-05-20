#!/usr/bin/env bash
set -euo pipefail

# Put your local dnd-notes checkout here, or pass it as the first argument.
DND_NOTES_REPO="${1:-${DND_NOTES_REPO:-/tmp/dnd-notes}}"

bun scripts/import-real-moments-species-cards.ts "$DND_NOTES_REPO"
