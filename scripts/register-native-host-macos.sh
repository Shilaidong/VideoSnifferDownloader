#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST_DIR="$ROOT/runtime/native-host"
HOST_EXE="$HOST_DIR/video-sniffer-host"
TEMPLATE_PATH="$ROOT/native-host/native-host-manifest.template.json"
MANIFEST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
MANIFEST_PATH="$MANIFEST_DIR/com.videosnifferdownloader.host.json"

if [[ ! -f "$HOST_EXE" ]]; then
  echo "Native host executable not found: $HOST_EXE" >&2
  exit 1
fi

mkdir -p "$HOST_DIR" "$MANIFEST_DIR"

ESCAPED_HOST_EXE="${HOST_EXE//\\/\\\\}"
ESCAPED_HOST_EXE="${ESCAPED_HOST_EXE//\"/\\\"}"

cat > "$MANIFEST_PATH" <<EOF
{
  "name": "com.videosnifferdownloader.host",
  "description": "Native host bridge for Video Sniffer Downloader.",
  "path": "$ESCAPED_HOST_EXE",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://jcheaabaeeaajlbhccgpldhbpdjjcmke/"
  ]
}
EOF

chmod +x "$HOST_EXE"
chmod +x "$ROOT/runtime/bin/N_m3u8DL-RE" "$ROOT/runtime/bin/ffmpeg" 2>/dev/null || true
xattr -dr com.apple.quarantine "$ROOT" 2>/dev/null || true

echo "Native host registered:"
echo "Manifest: $MANIFEST_PATH"
echo "Chrome extension path: $ROOT/extension"
