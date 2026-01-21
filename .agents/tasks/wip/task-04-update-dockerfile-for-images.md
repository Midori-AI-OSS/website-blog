# Task 04: Update Dockerfile to Properly Handle Images

## Objective
Ensure the Dockerfile correctly copies and serves blog images in the production build.

## Specific Actions
1. Update Dockerfile COPY instructions:
   - Ensure `public` directory (or wherever images are stored) is copied into the image
   - Add explicit COPY for image directories if missing
   - Verify the COPY happens after dependencies but before build

2. Check multi-stage build setup:
   - If using multi-stage build, ensure images are copied to final stage
   - Verify files aren't lost between build stages

3. Set proper permissions:
   - Ensure image directories have correct ownership
   - Make directories readable by the Next.js process user

4. Add any necessary directories:
   - Create directories if they don't exist (e.g., `mkdir -p /app/public/images`)
   - Ensure directory structure matches what Next.js expects

## Expected Output
- Updated Dockerfile with proper image handling
- All necessary directories created and copied
- Correct file permissions set

## Success Criteria
- Docker build completes successfully with `docker build -t blog .`
- Images are present in the built container
- No missing file errors during container startup

## Dependencies
- Requires completion of Task 01 (know image locations)
