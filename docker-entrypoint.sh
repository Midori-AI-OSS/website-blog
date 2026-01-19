#!/bin/bash
set -e

# Run bun install if node_modules doesn't exist
echo "Installing dependencies..."
bun install

# Build the application
echo "Building application..."
bun run build

# Start the application
echo "Starting application..."
bun run start
