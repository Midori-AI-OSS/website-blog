# Audit: Command Injection Risk in ffprobe Route

**Target file:** `app/api/radio/probe/route.ts`

The probe route calls `execFile(FFPROBE_PATH, [...args, streamUrl])` using a stream URL. While `execFile` separates arguments safely, the URL itself is user-influenced via channel parameter and the construction of the stream URL should be audited.

## Steps

1. Read `app/api/radio/probe/route.ts` in full. Identify the `execFile` call and the list of arguments passed to `ffprobe`.
2. Trace the `streamUrl` construction — does it come from user input directly or indirectly? Read `lib/radio/contract.ts` (where `normalizeChannel()` lives) and any URL-building logic in `lib/radio/client.ts`.
3. Check: is `ffprobe` executed with a remote URL directly? What happens if the remote server returns a malicious response? (Secondary attack.)
4. Check if there's a timeout on the `execFile` call — can it hang indefinitely (DoS)?
5. Check what information from stderr/stdout is returned to the client — could it leak system information?

## Output

- Document the exact code path from user input to `execFile` with line numbers.
- Assess whether argument injection is possible.
- Flag any information leak in the error/response path.
- Recommend fixes (timeout, stderr sanitization, URL validation, consider proxying through the radio client instead of calling ffprobe directly on a remote URL).
- Save findings to `/tmp/agents-artifacts/tasks/audit-command-injection-ffprobe-report.md`.
