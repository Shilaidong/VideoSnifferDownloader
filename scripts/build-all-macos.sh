#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

"$SCRIPT_DIR/download-runtime-macos.sh"
"$SCRIPT_DIR/build-host-macos.sh"
"$SCRIPT_DIR/register-native-host-macos.sh"

echo ""
echo "All done."
echo "1. Open chrome://extensions/"
echo "2. Enable developer mode"
echo "3. Load unpacked extension from: $ROOT/extension"
