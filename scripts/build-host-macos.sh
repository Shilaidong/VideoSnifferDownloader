#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST_OUTPUT_DIR="$ROOT/runtime/native-host"
HOST_OUTPUT_PATH="$HOST_OUTPUT_DIR/video-sniffer-host"

mkdir -p "$HOST_OUTPUT_DIR" "$HOST_OUTPUT_DIR/requests"

case "$(uname -m)" in
  arm64)
    PKG_TARGET="node18-macos-arm64"
    ;;
  x86_64)
    PKG_TARGET="node18-macos-x64"
    ;;
  *)
    echo "Unsupported macOS architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

(cd "$ROOT" && npm install && npx pkg "./native-host/src/index.js" --targets "$PKG_TARGET" --output "$HOST_OUTPUT_PATH")
chmod +x "$HOST_OUTPUT_PATH"

echo "macOS native host built at $HOST_OUTPUT_PATH"
