#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$ROOT_DIR/logs/pids"

if [[ ! -f "$PID_FILE" ]]; then
  echo "[BitAgent] No running services found (no PID file)."
  exit 0
fi

echo "[BitAgent] Stopping all services..."

while IFS=' ' read -r pid name; do
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    echo "  Stopped $name (PID $pid)"
  else
    echo "  $name (PID $pid) already stopped"
  fi
done < "$PID_FILE"

rm -f "$PID_FILE"
echo "[BitAgent] All services stopped."
