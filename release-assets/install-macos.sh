#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "$(basename "$SCRIPT_DIR")" == "release-assets" ]]; then
  ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
else
  ROOT="$SCRIPT_DIR"
fi
HOST_DIR="$ROOT/runtime/native-host"
HOST_EXE="$HOST_DIR/video-sniffer-host"
TEMPLATE_PATH="$ROOT/native-host/native-host-manifest.template.json"
MANIFEST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
MANIFEST_PATH="$MANIFEST_DIR/com.videosnifferdownloader.host.json"

if [[ ! -f "$HOST_EXE" ]]; then
  echo "Missing file: $HOST_EXE" >&2
  exit 1
fi

if [[ ! -f "$TEMPLATE_PATH" ]]; then
  echo "Missing file: $TEMPLATE_PATH" >&2
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

echo ""
echo "Video Sniffer Downloader installed for macOS."
echo "Chrome extension path:"
echo "$ROOT/extension"
echo ""
echo "Next steps:"
echo "1. Open chrome://extensions/"
echo "2. Enable developer mode"
echo "3. Load unpacked extension from the path above"
echo ""
echo "If you move this folder later, run install-macos.sh again."
