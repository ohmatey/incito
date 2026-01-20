#!/bin/bash
# Build MCP sidecar binary for Tauri
# Detects current platform and outputs binary with correct target triple suffix

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MASTRA_DIR="$(dirname "$SCRIPT_DIR")"
BINARIES_DIR="$MASTRA_DIR/../src-tauri/binaries"

# Detect OS and architecture
OS="$(uname -s)"
ARCH="$(uname -m)"

# Map to Rust target triple format (used by Tauri)
case "$OS" in
  Darwin)
    case "$ARCH" in
      arm64)
        TARGET="aarch64-apple-darwin"
        ;;
      x86_64)
        TARGET="x86_64-apple-darwin"
        ;;
      *)
        echo "Unsupported macOS architecture: $ARCH"
        exit 1
        ;;
    esac
    ;;
  Linux)
    case "$ARCH" in
      x86_64)
        TARGET="x86_64-unknown-linux-gnu"
        ;;
      aarch64)
        TARGET="aarch64-unknown-linux-gnu"
        ;;
      *)
        echo "Unsupported Linux architecture: $ARCH"
        exit 1
        ;;
    esac
    ;;
  MINGW*|MSYS*|CYGWIN*|Windows_NT)
    TARGET="x86_64-pc-windows-msvc"
    ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

OUTPUT_FILE="$BINARIES_DIR/incito-mcp-$TARGET"

# Add .exe extension on Windows
if [[ "$OS" == MINGW* ]] || [[ "$OS" == MSYS* ]] || [[ "$OS" == CYGWIN* ]] || [[ "$OS" == Windows_NT ]]; then
  OUTPUT_FILE="$OUTPUT_FILE.exe"
fi

echo "Building MCP sidecar for $TARGET..."
echo "Output: $OUTPUT_FILE"

# Ensure binaries directory exists
mkdir -p "$BINARIES_DIR"

# Build with Bun
cd "$MASTRA_DIR"
bun build ./src/mcp/stdio.ts --compile --outfile "$OUTPUT_FILE"

echo "Done! Built: $OUTPUT_FILE"
