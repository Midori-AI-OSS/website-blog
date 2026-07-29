# TTS Fixes — Inline Code Speech & Chunk Transition Highlight Timing

## Commits

| Commit | Description |
|--------|-------------|
| `8c65c3f` | fix(tts): speak inline code instead of dropping it from TTS extraction |
| `5c42559` | Fix TTS highlight handoff on streamed chunk transitions |

## Fix 1: Inline-code text in speech and DOM-to-speech matching

**Problem:** Inline code (`` `spells` ``) was silently dropped from TTS extraction. `inlineText()` returned `''` for `inlineCode` mdast nodes, so the spoken document omitted inline code content. DOM normalization excluded `<code>` elements entirely, causing paragraph mapping failures.

**Changes:**
- `lib/tts/speechDocument.ts`: `inlineText()` returns `node.value` for `inlineCode` nodes instead of `''`
- `lib/tts/highlight.ts`: Removed `CODE` from the excluded-elements set in `getSpeechDomCandidates()` so DOM text normalization includes inline code text and matches the speech document. Added a guard in `wrapSegment()` to prevent inserting highlight spans inside `<code>` elements (inline code reads unhighlighted).

**Verification:**
- `lib/tts/speechDocument.test.ts`: Regression test `'speaks inline code as its literal value alongside other prose'` added
- `lib/tts/highlight.test.ts`: Test `'keeps inline code excluded while highlighting spoken text around it'` validates correct DOM matching and no highlighting inside `<code>`
- All 17 `lib/tts/` tests pass

## Fix 2: Chunk transition highlight timing

**Problem:** During streamed chunk transitions, highlights for the next chunk were emitted before audio playback started, causing visual desync where content appeared highlighted before being heard.

**Changes:**
- `components/blog/TtsPlayer.tsx`: Added `chunkTransitioningRef` ref to track in-progress transitions
- `tryStartChunkPlayback()`: Sets transition flag and emits `null` highlight before swapping audio source
- `syncTimelineFromAudio()`: Skips `syncHighlight()` while `chunkTransitioningRef.current` is true
- `handlePlayingEvent`: Clears transition flag so highlights resume only after audio starts
- `handleEnded`: Emits `null` highlight before transitioning to the next chunk
- Transition flag is also cleared on stop, `loadReadyAudio`, and end-of-stream
- Added `emitHighlight` to `tryStartChunkPlayback` dependency array

**Verification:**
- `components/blog/TtsPlayer.test.tsx`: New test `'clears highlights on chunk transition and restores after audio starts playing'` validates the full multi-chunk streaming flow with highlight clearing and restoration
- All 14 `TtsPlayer` tests pass

## Full Test Suite

All **303 tests** across 27 files pass (0 failures, 1038 expect calls).

## Audit Result

No defects found in either fix. Implementation matches the approved specification. Tests provide adequate coverage for the changed behavior.
