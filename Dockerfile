# Dockerfile for JS App (Production)
# Use PixelArch Quartz as base image

FROM lunamidori5/pixelarch:quartz

# Update OS release info
RUN sudo sed -i 's/Quartz/Bun-Server/g' /etc/os-release

# Install necessary packages
RUN yay -Syu --noconfirm curl && yay -Yccc --noconfirm
RUN yay -Syu --noconfirm wget && yay -Yccc --noconfirm
RUN yay -Syu --noconfirm git && yay -Yccc --noconfirm
RUN yay -Syu --noconfirm base-devel && yay -Yccc --noconfirm
RUN yay -Syu --noconfirm nodejs && yay -Yccc --noconfirm
RUN yay -Syu --noconfirm unzip && yay -Yccc --noconfirm
RUN yay -Syu --noconfirm npm && yay -Yccc --noconfirm
RUN yay -Syu --noconfirm bun && yay -Yccc --noconfirm

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy application source code
COPY . .

# Ensure public directory and images exist with proper structure
RUN mkdir -p /app/public/blog && \
    mkdir -p /app/public/blog/unassigned

# Set proper permissions for image directories
RUN chmod -R 755 /app/public && \
    chown -R midori-ai:midori-ai /app/public

# Build the Next.js application
RUN bun run build

EXPOSE 59382

# Start the application directly (no entrypoint script needed in production)
CMD ["bun", "run", "start"]
