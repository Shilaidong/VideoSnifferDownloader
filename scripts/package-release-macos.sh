#!/bin/bash
set -euo pipefail

REBUILD=0
if [[ "${1:-}" == "--rebuild" ]]; then
  REBUILD=1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VERSION="$(cd "$ROOT" && node -p "require('./package.json').version")"

case "$(uname -m)" in
  arm64)
    ARCH="arm64"
    ;;
  x86_64)
    ARCH="x64"
    ;;
  *)
    echo "Unsupported macOS architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

BIN_DIR="$ROOT/runtime/bin"
HOST_DIR="$ROOT/runtime/native-host"
HOST_EXE="$HOST_DIR/video-sniffer-host"
NM3U8_BIN="$BIN_DIR/N_m3u8DL-RE"
FFMPEG_BIN="$BIN_DIR/ffmpeg"

if [[ "$REBUILD" == "1" || ! -f "$NM3U8_BIN" || ! -f "$FFMPEG_BIN" ]]; then
  "$SCRIPT_DIR/download-runtime-macos.sh"
fi

if [[ "$REBUILD" == "1" || ! -f "$HOST_EXE" ]]; then
  "$SCRIPT_DIR/build-host-macos.sh"
fi

DIST_DIR="$ROOT/dist"
RELEASE_NAME="VideoSnifferDownloader-v$VERSION-macos-$ARCH-portable"
STAGE_DIR="$DIST_DIR/$RELEASE_NAME"
ZIP_PATH="$DIST_DIR/$RELEASE_NAME.zip"

rm -rf "$STAGE_DIR" "$ZIP_PATH"
mkdir -p "$STAGE_DIR/extension" "$STAGE_DIR/native-host" "$STAGE_DIR/runtime/bin" "$STAGE_DIR/runtime/native-host"

cp "$ROOT/README.md" "$STAGE_DIR/README.md"
cp "$ROOT/README-BEGINNER.md" "$STAGE_DIR/README-BEGINNER.md"
cp "$ROOT/LICENSE" "$STAGE_DIR/LICENSE"
cp "$ROOT/THIRD_PARTY_NOTICES.md" "$STAGE_DIR/THIRD_PARTY_NOTICES.md"
cp "$ROOT/release-assets/install-macos.sh" "$STAGE_DIR/install-macos.sh"
cp "$ROOT/native-host/native-host-manifest.template.json" "$STAGE_DIR/native-host/native-host-manifest.template.json"
cp "$HOST_EXE" "$STAGE_DIR/runtime/native-host/video-sniffer-host"
cp -R "$ROOT/extension/." "$STAGE_DIR/extension/"
cp "$NM3U8_BIN" "$STAGE_DIR/runtime/bin/N_m3u8DL-RE"
cp "$FFMPEG_BIN" "$STAGE_DIR/runtime/bin/ffmpeg"

chmod +x "$STAGE_DIR/install-macos.sh" "$STAGE_DIR/runtime/native-host/video-sniffer-host" "$STAGE_DIR/runtime/bin/N_m3u8DL-RE" "$STAGE_DIR/runtime/bin/ffmpeg"

(cd "$DIST_DIR" && zip -qr "$ZIP_PATH" "$RELEASE_NAME")

echo "Release folder: $STAGE_DIR"
echo "Release zip: $ZIP_PATH"
