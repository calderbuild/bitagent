#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
PID_FILE="$LOG_DIR/pids"

mkdir -p "$LOG_DIR"
> "$PID_FILE"

# Load .env
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
else
  echo "[ERROR] .env not found. Copy .env.example to .env and fill in values."
  exit 1
fi

# Use Node 22 if available (required for Vite 7)
if [[ -d "$HOME/.nvm/versions/node/v22.22.0" ]]; then
  export PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH"
fi

NODE_VERSION=$(node -v 2>/dev/null || echo "none")
echo "[BitAgent] Node: $NODE_VERSION"
echo "[BitAgent] Root: $ROOT_DIR"
echo ""

# Build agent if dist/ doesn't exist
if [[ ! -d "$ROOT_DIR/agent/dist" ]]; then
  echo "[BitAgent] Building agent..."
  (cd "$ROOT_DIR/agent" && npx tsc)
fi

start_service() {
  local name="$1"
  local cmd="$2"
  local log="$LOG_DIR/$name.log"

  echo "[BitAgent] Starting $name..."
  (cd "$ROOT_DIR/agent" && $cmd > "$log" 2>&1) &
  local pid=$!
  echo "$pid $name" >> "$PID_FILE"
  echo "[BitAgent]   PID=$pid  log=$log"
}

# 1. Facilitator
start_service "facilitator" "npx tsx src/facilitator/server.ts"
sleep 2

# 2. Agents (staggered to avoid nonce collisions on shared wallet)
start_service "code-auditor" "npx tsx src/services/code-auditor.ts"
sleep 3
start_service "translate-bot" "npx tsx src/services/translate-bot.ts"
sleep 3
start_service "data-analyst" "npx tsx src/services/data-analyst.ts"
sleep 3
start_service "orchestrator" "npx tsx src/services/orchestrator.ts"
sleep 2

# 3. Frontend
echo "[BitAgent] Starting frontend..."
(cd "$ROOT_DIR/frontend" && npx vite --port 5173 > "$LOG_DIR/frontend.log" 2>&1) &
FRONTEND_PID=$!
echo "$FRONTEND_PID frontend" >> "$PID_FILE"
echo "[BitAgent]   PID=$FRONTEND_PID  log=$LOG_DIR/frontend.log"

echo ""
echo "========================================"
echo "  BitAgent -- All Services Running"
echo "========================================"
echo ""
echo "  Dashboard:    http://localhost:5173"
echo "  Facilitator:  http://localhost:4022"
echo "  CodeAuditor:  http://localhost:3001"
echo "  TranslateBot: http://localhost:3002"
echo "  DataAnalyst:  http://localhost:3003"
echo "  Orchestrator: http://localhost:3004"
echo ""
echo "  Logs:         $LOG_DIR/"
echo "  Stop all:     bash scripts/stop-all.sh"
echo ""
echo "  Waiting for agents to boot (chain registration)..."
sleep 5

# Health check
ok=0
for port in 4022 3001 3002 3003 3004; do
  if curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
    ok=$((ok + 1))
  fi
done
echo "  Health check: $ok/5 services responding"
echo ""
echo "  Ready for demo: bash scripts/run-demo.sh"
echo "========================================"
