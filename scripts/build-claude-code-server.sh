#!/bin/bash
set -e

echo "Building Claude Code server..."

cd "$(dirname "$0")/../apps/desktop/claude-code-server"

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "Error: Bun is not installed. Please install it first:"
    echo "  curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
bun install

# Build for all platforms
echo "Building binaries..."
bun run build.ts

echo ""
echo "Build complete! Binaries are in src-tauri/binaries/"
ls -la ../src-tauri/binaries/claude-code-server-* 2>/dev/null || echo "(No binaries found - build may have failed)"
