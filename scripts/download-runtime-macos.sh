#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="$ROOT/runtime/bin"
CACHE_DIR="$ROOT/.tmp/downloads"

mkdir -p "$BIN_DIR" "$CACHE_DIR"

case "$(uname -m)" in
  arm64)
    NM_PLATFORM="osx-arm64"
    ;;
  x86_64)
    NM_PLATFORM="osx-x64"
    ;;
  *)
    echo "Unsupported macOS architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

NM_ASSET_URL="$(
  curl -fsSL https://api.github.com/repos/nilaoda/N_m3u8DL-RE/releases/latest |
    node -e '
      let input = "";
      process.stdin.on("data", chunk => input += chunk);
      process.stdin.on("end", () => {
        const release = JSON.parse(input);
        const platform = process.argv[1];
        const asset = release.assets.find(item => item.name.includes(platform) && item.name.endsWith(".tar.gz"));
        if (!asset) {
          console.error(`Unable to find N_m3u8DL-RE asset for ${platform}.`);
          process.exit(1);
        }
        console.log(asset.browser_download_url);
      });
    ' "$NM_PLATFORM"
)"

NM_ARCHIVE="$CACHE_DIR/N_m3u8DL-RE-$NM_PLATFORM.tar.gz"
NM_EXTRACT="$CACHE_DIR/N_m3u8DL-RE-$NM_PLATFORM"

rm -rf "$NM_EXTRACT"
mkdir -p "$NM_EXTRACT"
curl -fL "$NM_ASSET_URL" -o "$NM_ARCHIVE"
tar -xzf "$NM_ARCHIVE" -C "$NM_EXTRACT"

NM_BINARY="$(find "$NM_EXTRACT" -type f -name "N_m3u8DL-RE" | head -n 1)"
if [[ -z "$NM_BINARY" ]]; then
  echo "N_m3u8DL-RE binary not found in downloaded archive." >&2
  exit 1
fi

cp "$NM_BINARY" "$BIN_DIR/N_m3u8DL-RE"
chmod +x "$BIN_DIR/N_m3u8DL-RE"

if [[ ! -d "$ROOT/node_modules/ffmpeg-static" ]]; then
  (cd "$ROOT" && npm install)
fi

FFMPEG_PATH="$(cd "$ROOT" && node -p "require('ffmpeg-static')")"
if [[ -z "$FFMPEG_PATH" || ! -f "$FFMPEG_PATH" ]]; then
  echo "ffmpeg-static did not provide a macOS ffmpeg binary." >&2
  exit 1
fi

cp "$FFMPEG_PATH" "$BIN_DIR/ffmpeg"
chmod +x "$BIN_DIR/ffmpeg"

echo "macOS runtime binaries downloaded into $BIN_DIR"
