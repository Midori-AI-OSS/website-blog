# Task 05: Configure Next.js Image Optimization for Production

## Objective
Configure Next.js image handling to work correctly in Docker production environment with hot-reloading support.

## Specific Actions
1. Update `next.config.js` (or `.mjs`):
   - Configure `images.unoptimized` if needed for Docker
   - Set `images.domains` or `images.remotePatterns` if loading external images
   - Add `images.loader` configuration if using custom setup

2. Configure static file serving:
   - Ensure `public` directory is properly configured
   - Check if custom static paths are needed
   - Verify image path resolution strategy

3. Add image directory handling:
   - Configure proper paths for blog post images
   - Ensure compatibility with Docker container paths
   - Set up any necessary rewrites or redirects

4. Consider performance:
   - Enable/disable image optimization based on production needs
   - Configure image caching strategy
   - Set appropriate image formats (webp, etc.)

## Expected Output
- Updated Next.js configuration file
- Proper image optimization settings for Docker
- Configuration that supports hot-reloading

## Success Criteria
- Next.js config file is valid (no syntax errors)
- Build succeeds with new configuration: `bun run build`
- Image serving strategy is appropriate for production Docker

## Dependencies
- Requires completion of Task 01 and Task 02 (understand current setup and issue)
