#!/bin/bash
set -e

# Run bun install if node_modules doesn't exist
echo "Installing dependencies..."
bun install

# Install Python TTS dependencies
echo "Installing TTS dependencies..."
cd /app/tts && uv sync && cd /app

# Build the application
echo "Building application..."
bun run build

# Start the TTS server in the background
echo "Starting TTS server..."
cd /app/tts && uv run uvicorn server:app --host 127.0.0.1 --port 8888 &
TTS_PID=$!
cd /app

# Start the application
echo "Starting application..."
bun run start
