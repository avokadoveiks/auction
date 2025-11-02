#!/usr/bin/env bash
# stop_server.sh — stop dev server started by dev-start.sh
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PIDFILE="$ROOT_DIR/server.pid"

if [ ! -f "$PIDFILE" ]; then
  echo "No PID file found at $PIDFILE. Server may not be running."
  exit 1
fi

PID="$(cat "$PIDFILE" 2>/dev/null || echo "")"
if [ -z "$PID" ]; then
  echo "PID file is empty. Removing..."
  rm -f "$PIDFILE"
  exit 1
fi

if kill -0 "$PID" 2>/dev/null; then
  echo "Stopping dev server (pid=$PID)..."
  kill "$PID" || true
  sleep 1
  if kill -0 "$PID" 2>/dev/null; then
    echo "Force killing (pid=$PID)..."
    kill -9 "$PID" || true
  fi
  rm -f "$PIDFILE"
  echo "Stopped."
else
  echo "Process $PID not running. Removing stale PID file."
  rm -f "$PIDFILE"
fi
