# Task 03: Fix Docker Volume Mounts for Image Hot-Reloading

## Objective
Configure Docker volume mounts to enable hot-reloading of images without server restart in production containers.

## Specific Actions
1. Update `docker-compose.yaml`:
   - Add volume mount for the images directory (e.g., `./public:/app/public` or similar)
   - Ensure the mount is read-write for hot-reloading
   - Add any additional static asset directories that need hot-reloading

2. Verify volume mount syntax:
   - Use correct bind mount syntax for Docker Compose
   - Ensure paths are relative to docker-compose.yaml location
   - Add comments explaining the purpose of each volume

3. Consider caching implications:
   - Check if Next.js image optimization cache needs a volume
   - Add volume for `.next/cache/images` if needed for persistence

4. Test locally:
   - Use `bun run build` to create production build
   - Start containers with `docker compose up`
   - Verify volumes are mounted correctly with `docker compose exec <service> ls -la /app/public`

## Expected Output
- Updated `docker-compose.yaml` with proper volume mounts
- Images directory accessible and writable in container
- Configuration ready for hot-reloading

## Success Criteria
- Volume mounts configured correctly
- No errors when starting containers
- Can verify files are visible inside container

## Dependencies
- Requires completion of Task 01 (know which directories to mount)
