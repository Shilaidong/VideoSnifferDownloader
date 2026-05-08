#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VERSION="$(cd "$ROOT" && node -p "require('./extension/manifest.json').version")"
DIST_DIR="$ROOT/dist"
STORE_DIR="$DIST_DIR/chrome-web-store"
ZIP_PATH="$STORE_DIR/VideoSnifferDownloader-v$VERSION-chrome-web-store.zip"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

mkdir -p "$STORE_DIR"
node "$SCRIPT_DIR/generate-store-assets.js"

rm -f "$ZIP_PATH"
(cd "$ROOT/extension" && zip -qr "$ZIP_PATH" .)

if [[ -x "$CHROME" ]]; then
  "$CHROME" --headless --disable-gpu --hide-scrollbars --window-size=1280,800 --screenshot="$STORE_DIR/screenshot-1280x800.png" "file://$ROOT/store-assets/screenshot.html" >/dev/null 2>&1 || true
  "$CHROME" --headless --disable-gpu --hide-scrollbars --window-size=440,280 --screenshot="$STORE_DIR/promo-440x280.png" "file://$ROOT/store-assets/promo.html" >/dev/null 2>&1 || true
fi

cp "$ROOT/extension/icons/icon128.png" "$STORE_DIR/icon128.png"

echo "Chrome Web Store zip: $ZIP_PATH"
echo "Store assets: $STORE_DIR"
