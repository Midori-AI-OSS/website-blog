# Task 06: Test Image Hot-Reloading in Production Container

## Objective
Verify that images can be added/updated without restarting the Docker container, simulating production behavior.

## Specific Actions
1. Build and start the production container:
   ```bash
   bun run build
   docker compose down
   docker compose up -d
   ```

2. Verify the current 404 is fixed:
   - Check that `2026-01-21.webp` now loads correctly
   - Visit https://blog.midori-ai.xyz/blog/2026-01-21 (or test locally)
   - Confirm no 404 errors in browser console

3. Test hot-reloading:
   - Add a new test image to the images directory
   - Wait a few seconds (no restart)
   - Verify the new image is accessible via HTTP
   - Try updating an existing image and confirm it updates

4. Check logs:
   - Review Docker container logs: `docker compose logs -f`
   - Look for any errors or warnings
   - Verify Next.js is serving files correctly

5. Test multiple scenarios:
   - Add image while container is running
   - Update existing image
   - Delete and re-add image
   - Verify all scenarios work without restart

## Expected Output
- Container runs without errors
- 404 issue for `2026-01-21.webp` is resolved
- New images are accessible without container restart
- Logs show no errors related to image serving

## Success Criteria
- Blog post at /blog/2026-01-21 shows the image correctly
- Can add new images to the filesystem and access them immediately
- No server restart required for image updates
- All tests pass in production-like environment

## Dependencies
- Requires completion of Tasks 03, 04, and 05 (all fixes implemented)
