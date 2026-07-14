# Audit: TTS Text Input Abuse

**Target files:**
- `app/api/tts/generate/route.ts`
- `tts/server.py`

The TTS generate API accepts arbitrary text from the client and forwards it to the Python TTS daemon for speech synthesis.

## Steps

1. Read `app/api/tts/generate/route.ts` — check how `text` is extracted from the request body, what validation/sanitization is applied, and what limits are enforced.
2. Read `tts/server.py` — inspect the `_clean_text()` function and the `/generate` endpoint. What text makes it through to the Kokoro model? Is there a max input length?
3. Check for resource exhaustion: could an attacker submit a very long text (e.g., a megabyte of text) to consume CPU/RAM on the TTS server? Is there a timeout?
4. Check for abuse: could the TTS service be used to generate audio of arbitrary content (hate speech, spam, etc.) with no moderation?
5. Check: is the TTS daemon binding to `0.0.0.0:8888` or only `127.0.0.1:8888`? If it's on `0.0.0.0`, it's exposed directly to the network.
6. Check the Docker setup — is port 8888 exposed externally?

## Output

- Document the full text input flow with line numbers at each stage.
- Report on max text size enforcement, rate limiting, and binding address.
- Recommend: max text length limit, rate limit on generate requests, ensure TTS binds to localhost only.
- Save findings to `/tmp/agents-artifacts/tasks/audit-tts-input-abuse-report.md`.
