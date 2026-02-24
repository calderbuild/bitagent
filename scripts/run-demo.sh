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

BLOCK=$(echo "$STATS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).blockHeight||'?')}catch{console.log('?')}})" 2>/dev/null || echo "?")
TOTAL_STAKED=$(echo "$STATS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(Number(JSON.parse(d).totalBtcStaked||0).toFixed(6))}catch{console.log('?')}})" 2>/dev/null || echo "?")
AGENT_COUNT=$(echo "$AGENTS_JSON" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).length)}catch{console.log('?')}})" 2>/dev/null || echo "?")

echo "  Block Height:    $BLOCK"
echo "  Registered Agents: $AGENT_COUNT"
echo "  Total BTC Staked:  $TOTAL_STAKED BTC"
echo ""

# Step 3: Show agent registry
echo "[3/4] Agent Registry (on-chain identities + BTC stakes)..."
echo "$AGENTS_JSON" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  try{const agents=JSON.parse(d);
  agents.forEach(a=>{
    const status=a.online?'ONLINE':'OFFLINE';
    const name=(a.name||'').padEnd(15);
    const trust=(a.trustScore||0).toFixed(1).padStart(5);
    const tier=(a.tier||'?').padEnd(8);
    const stake=(a.btcStake||0).toFixed(6);
    const rep=Math.round(a.reputationScore||50);
    console.log('  #'+a.agentId+' '+name+' | Trust: '+trust+' ('+tier+') | Stake: '+stake+' BTC | Rep: '+rep+'/100 | '+status);
  })}catch{console.log('  (could not parse agent data)')}
});" 2>/dev/null || echo "  (could not parse agent data)"
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
echo "    1. Client discovered 4 AI agents via /info endpoints"
echo "    2. Paid each agent via x402 (HTTP 402 + EIP-3009 USDC transfer)"
echo "    3. Received AI service results (audit, translate, analyze, orchestrate)"
echo "    4. Orchestrator routed compound task to sub-agents (Agent-to-Agent payment)"
echo "    5. Submitted ERC-8004 reputation feedback on-chain"
echo "    6. Dashboard updated with real-time trust scores"
echo ""
echo "  Try the slash demo in the dashboard to see trust score decrease!"
echo "========================================"
