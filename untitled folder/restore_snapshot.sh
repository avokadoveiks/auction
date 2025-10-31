#!/usr/bin/env zsh
# Restore files to the 2025-10-13 baseline snapshot
set -euo pipefail
snap="snapshots/2025-10-13"
for f in v1.html v1.css v1.js; do
  if [[ -f "$snap/$f" ]]; then
    cp -f "$snap/$f" "./$f"
    echo "Restored $f from $snap/$f"
  else
    echo "Missing $snap/$f" >&2
  fi
done
