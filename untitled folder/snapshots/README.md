# Snapshots

This folder contains a point-in-time snapshot of the client-only game files.

## 2025-10-13
Files:
- v1.html
- v1.css
- v1.js

Restore to this snapshot:
```zsh
cp -f "snapshots/2025-10-13/v1.html" ./v1.html
cp -f "snapshots/2025-10-13/v1.css" ./v1.css
cp -f "snapshots/2025-10-13/v1.js" ./v1.js
```

If you want a one-liner:
```zsh
for f in v1.html v1.css v1.js; do cp -f "snapshots/2025-10-13/$f" "./$f"; done
```
