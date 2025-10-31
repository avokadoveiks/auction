#!/usr/bin/env bash
# start_server.sh — start/stop a persistent static server for the project
# Usage: ./start_server.sh start|stop|status

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=5500
PIDFILE="$ROOT_DIR/server.pid"
LOGFILE="$ROOT_DIR/server.log"

start_server() {
    if [ -f "$PIDFILE" ]; then
        PID=$(cat "$PIDFILE" 2>/dev/null || echo "")
        if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
            echo "Server already running (pid=$PID).";
            return 0
        else
            echo "Stale PID file found, removing.";
            rm -f "$PIDFILE"
        fi
    fi

    echo "Starting python3 http.server on port $PORT..."
    cd "$ROOT_DIR"
    nohup python3 -m http.server "$PORT" >"$LOGFILE" 2>&1 &
    echo $! >"$PIDFILE"
    echo "Started (pid=$(cat "$PIDFILE")). Logs: $LOGFILE"
}

stop_server() {
    if [ -f "$PIDFILE" ]; then
        PID=$(cat "$PIDFILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "Stopping server pid=$PID..."
            kill "$PID"
            rm -f "$PIDFILE"
            echo "Stopped."
            return 0
        else
            echo "No process $PID, removing stale PID file.";
            rm -f "$PIDFILE"
            return 1
        fi
    else
        echo "Server not running (no PID file)."
        return 1
    fi
}

status_server() {
    if [ -f "$PIDFILE" ]; then
        PID=$(cat "$PIDFILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "Running (pid=$PID). Log: $LOGFILE"
            return 0
        else
            echo "PID file present but process not running.";
            return 1
        fi
    else
        echo "Not running."
        return 1
    fi
}

case "${1:-}" in
    start) start_server ;;
    stop) stop_server ;;
    status) status_server ;;
    *) echo "Usage: $0 start|stop|status"; exit 2 ;;
esac
