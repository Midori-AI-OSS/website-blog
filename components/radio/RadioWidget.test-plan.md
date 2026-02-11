# Radio Widget v1 Test Plan

## Contract and Parsing
- Confirm browser JSON requests hit same-origin proxy endpoints:
- `/api/radio/channels`
- `/api/radio/current?channel=<name>`
- `/api/radio/art?channel=<name>`
- Confirm `ok=false` responses surface `error.code` and `error.message` in widget status text.
- Confirm stream URL is always built with both `channel` and `q`.

## Desktop Gate
- Verify widget renders only when all are true:
- `(hover: hover)`
- `(pointer: fine)`
- viewport width `>= 1024px`
- Start playback on desktop, switch to a non-desktop viewport, and verify playback keeps running while widget is hidden.

## Hover Linger and Collapse
- Verify widget remains expanded for roughly 3 seconds after mouse leave.
- Re-enter during the 3-second window and verify collapse timer is canceled.
- Verify pinned mode ignores hover-close linger and remains open.

## Closed State Visual + Interaction
- Verify collapsed state shows only a music icon with tiny super-blurred backdrop image.
- Verify no title, status, slider, quality, or channel controls appear while collapsed.
- Verify clicking collapsed icon expands/pins open (does not toggle playback).

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
- Verify metadata-first behavior from `/api/radio/art` (upstream `/radio/v1/art`).
- Verify server art is used when reachable.
- Force art metadata/image failure and verify deterministic fallback from `/api/radio-images`.
- Verify placeholder image is set first, then target art is lazy-loaded.

## Error Recovery UX
- Trigger metadata failure and verify error text appears only in expanded panel.
- Verify successful metadata refresh clears stale error text and persisted `midoriai.radio.last_error`.

## Visual Rules
- Verify widget corners remain square in collapsed and expanded modes.
- Verify strong glass blur + backdrop overlay in expanded mode and heavy blur in collapsed mode.
- Verify control order in expanded mode:
- Play/Stop
- Volume slider
- Quality segmented control
- Channel selector
