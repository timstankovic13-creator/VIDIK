#!/bin/sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
PORT="${VIDIK_PORT:-8765}"
cd "$ROOT"
if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT" --bind 127.0.0.1 >/tmp/vidik-server.log 2>&1 &
  PID=$!
elif command -v python >/dev/null 2>&1; then
  python -m http.server "$PORT" --bind 127.0.0.1 >/tmp/vidik-server.log 2>&1 &
  PID=$!
else
  echo "VIDIK needs Python 3 to launch locally."
  exit 1
fi
trap 'kill "$PID" 2>/dev/null || true' EXIT INT TERM
sleep 1
URL="http://127.0.0.1:${PORT}/index.html"
if command -v open >/dev/null 2>&1; then open "$URL"; elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"; else echo "Open $URL in your browser."; fi
wait "$PID"
