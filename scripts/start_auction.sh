#!/usr/bin/env zsh
# Helper to start the Auction game
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$SCRIPT_DIR"
chmod +x ./dev-start.sh || true
./dev-start.sh
