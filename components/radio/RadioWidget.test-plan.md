# Radio Widget v1 Test Plan

## Contract and Parsing
- Confirm `/radio/v1/current`, `/radio/v1/art`, and `/radio/v1/channels` parse envelope fields (`version`, `ok`, `now`, `data`, `error`) correctly.
- Confirm `ok=false` responses surface `error.code` and `error.message` in widget status.
- Confirm stream URL is always built with both `channel` and `q`.

## Desktop Gate
- Verify widget renders only when all are true:
- `(hover: hover)`
- `(pointer: fine)`
- viewport width `>= 1024px`
- Start playback on desktop, switch to a non-desktop viewport, and verify playback keeps running while widget is hidden.

## Persistence
- Verify defaults on first load:
- `open=false`
- `volume=0.5`
- `quality=medium`
- `channel=all`
- Change open, volume, quality, and channel; reload page; verify values restore from `midoriai.radio.*`.

## Playback and Retry
- Verify play starts `/radio/v1/stream` with selected `channel` and `q`.
- Verify stop halts playback and clears reconnect timers.
- Simulate stream failure and verify bounded backoff sequence:
- `1s`, `2s`, `4s`, `8s`, `16s`, then capped at `30s`.
- Verify retry counter resets after successful `playing` event.

## Polling
- Verify `/current` and `/art` poll every `5s` while playback is active.
- Verify `/current` and `/art` poll every `20s` when not actively playing.
- Verify `/channels` refreshes every `60s`.

## Channel and Quality Behavior
- While playing, switch channel and verify immediate reconnect to the new channel stream.
- While playing, change quality and verify stream does not restart immediately.
- Stop then play again and verify selected quality is used.
- Provide unknown/empty channel input and verify fallback behavior resolves to `all`.

## Artwork Fallback Chain
- Verify metadata-first behavior from `/radio/v1/art`.
- Verify server art is used when reachable (`/radio/v1/art/image` or server-provided `art_url`).
- Force art metadata/image failure and verify deterministic fallback from `/api/radio-images`.
- Verify placeholder image is set first, then target art is lazy-loaded.

## Visual Rules
- Verify widget corners remain square in collapsed and expanded modes.
- Verify strong glass blur + backdrop image overlay are visible.
- Verify control order in expanded mode:
- Play/Stop
- Volume slider
- Quality segmented control
