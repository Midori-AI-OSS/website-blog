# Audit: Python TTS Daemon Security

**Target files:**
- `tts/server.py`
- `tts/pyproject.toml`
- `docker-entrypoint.sh` (TTS startup)

The Python FastAPI TTS server runs as a sidecar process. It should be audited for its own security posture independently of the Next.js proxy layer.

## Steps

1. Read `tts/server.py` thoroughly. Audit:
   - **Binding address**: Is it `127.0.0.1:8888` (localhost only) or `0.0.0.0:8888` (all interfaces)?
   - **CORS**: Is CORS middleware configured? What origins are allowed?
   - **Input validation**: The `/generate` endpoint — is text length checked? Are non-printable characters handled? Is there any shell injection risk in the text processing?
   - **File I/O**: Does it write temporary files? Where? Are paths derived from user input?
   - **Error handling**: Do error responses leak Python tracebacks?
   - **Logging**: Does it log sensitive data (text being synthesized, IPs)?
   - **Process spawning**: Does the TTS engine (`kokoro`) spawn subprocesses? Does text reach a shell?
2. Read `tts/pyproject.toml`:
   - Are all dependencies pinned to specific versions (no `>=` without upper bound)?
   - Is the spaCy model URL using HTTPS? Is there a hash/checksum?
3. Read `docker-entrypoint.sh`:
   - How is the TTS server started? Any `--reload` flag in production?
   - Is `uvicorn` run with workers? If so, does the model load per worker (memory multiplier)?
4. Check if the TTS server has any health-check endpoint that could leak version info.

## Output

- Document every security issue found in the Python layer, separate from the Next.js layer.
- Focus especially on the binding address (this is critical), input validation, and temp file handling.
- Save findings to `/tmp/agents-artifacts/tasks/audit-python-tts-security-report.md`.
