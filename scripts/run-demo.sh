#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Load .env
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

# Use Node 22 if available
if [[ -d "$HOME/.nvm/versions/node/v22.22.0" ]]; then
  export PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH"
fi

echo ""
echo "========================================"
echo "  BitAgent Demo -- BTC-Secured AI Agent Economy"
echo "  GOAT Network (Bitcoin L2) | Chain ID 48816"
echo "========================================"
echo ""

# Step 1: Health check
echo "[1/4] Checking services..."
SERVICES=("Facilitator:4022" "CodeAuditor:3001" "TranslateBot:3002" "DataAnalyst:3003" "Orchestrator:3004")
all_ok=true
for svc in "${SERVICES[@]}"; do
  name="${svc%%:*}"
  port="${svc##*:}"
  if curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
    echo "  [OK] $name on :$port"
  else
    echo "  [--] $name on :$port (not responding)"
    all_ok=false
  fi
done

if [[ "$all_ok" != "true" ]]; then
  echo ""
  echo "  Some services are not running. Start them first:"
  echo "    bash scripts/start-all.sh"
  echo ""
  exit 1
fi
echo ""

# Step 2: Show on-chain stats
echo "[2/4] Network stats from GOAT Testnet3..."
STATS=$(curl -sf "http://localhost:4022/api/stats" 2>/dev/null || echo '{}')
AGENTS_JSON=$(curl -sf "http://localhost:4022/api/agents" 2>/dev/null || echo '[]')

BLOCK=$(echo "$STATS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('blockHeight','?'))" 2>/dev/null || echo "?")
TOTAL_STAKED=$(echo "$STATS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"{d.get('totalBtcStaked',0):.6f}\")" 2>/dev/null || echo "?")
AGENT_COUNT=$(echo "$AGENTS_JSON" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")

echo "  Block Height:    $BLOCK"
echo "  Registered Agents: $AGENT_COUNT"
echo "  Total BTC Staked:  $TOTAL_STAKED BTC"
echo ""

# Step 3: Show agent registry
echo "[3/4] Agent Registry (on-chain identities + BTC stakes)..."
echo "$AGENTS_JSON" | python3 -c "
import sys, json
agents = json.load(sys.stdin)
for a in agents:
    status = 'ONLINE' if a.get('online') else 'OFFLINE'
    print(f\"  #{a['agentId']} {a['name']:15s} | Trust: {a.get('trustScore',0):5.1f} ({a.get('tier','?'):8s}) | Stake: {a.get('btcStake',0):.6f} BTC | Rep: {a.get('reputationScore',50):.0f}/100 | {status}\")
" 2>/dev/null || echo "  (could not parse agent data)"
echo ""

# Step 4: Run x402 paid calls + on-chain feedback
echo "[4/4] Running x402 client demo (paid AI service calls + on-chain feedback)..."
echo "  This calls each agent via HTTP 402 micropayments and submits"
echo "  ERC-8004 reputation feedback on-chain after each call."
echo ""

(cd "$ROOT_DIR/agent" && npx tsx src/client/index.ts)

echo ""
echo "========================================"
echo "  Demo Complete"
echo "========================================"
echo ""
echo "  Dashboard: http://localhost:5173"
echo ""
echo "  What just happened:"
echo "    1. Client discovered 3 AI agents via /info endpoints"
echo "    2. Paid each agent via x402 (HTTP 402 + EIP-3009 USDC transfer)"
echo "    3. Received AI service results (audit, translate, analyze)"
echo "    4. Submitted ERC-8004 reputation feedback on-chain"
echo "    5. Dashboard updated with real-time trust scores"
echo ""
echo "  Try the slash demo in the dashboard to see trust score decrease!"
echo "========================================"
