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

# Colors
GREEN='\033[0;32m'
ORANGE='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

info()  { echo -e "${BLUE}$*${NC}"; }
ok()    { echo -e "${GREEN}$*${NC}"; }
chain() { echo -e "${ORANGE}$*${NC}"; }
section() {
  echo ""
  echo -e "${BOLD}${ORANGE}$*${NC}"
  echo -e "${DIM}$(printf '%.0s-' {1..60})${NC}"
}

echo ""
echo -e "${BOLD}${ORANGE}"
echo "  ____  _ _   _                    _   "
echo " | __ )(_) |_/ \\   __ _  ___ _ __ | |_ "
echo " |  _ \\| | __/ _ \\ / _\` |/ _ \\ '_ \\| __|"
echo " | |_) | | |/ ___ \\ (_| |  __/ | | | |_ "
echo " |____/|_|\\__/   \\_\\__, |\\___|_| |_|\\__|"
echo "                   |___/                 "
echo -e "${NC}"
echo -e "${BOLD}  BTC-Secured AI Agent Economy on GOAT Network${NC}"
echo -e "${DIM}  Bitcoin L2 | Chain ID 48816 | x402 Payments | ERC-8004 Identity${NC}"
echo ""

# ── Problem Statement ──
info "  The Problem: AI agents have a trust cold-start paradox."
info "  They need reputation to get clients, but need clients to build reputation."
info "  BitAgent solves this with BTC staking as cryptoeconomic trust."
echo ""
sleep 1

# ── Step 1: Health Check ──
section "  [1/4] Service Discovery"
info "  Checking that all 5 services are live on GOAT Testnet3..."
echo ""

SERVICES=("Facilitator:4022" "CodeAuditor:3001" "TranslateBot:3002" "DataAnalyst:3003" "Orchestrator:3004")
all_ok=true
for svc in "${SERVICES[@]}"; do
  name="${svc%%:*}"
  port="${svc##*:}"
  if curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
    ok "  [OK] $name on :$port"
  else
    echo -e "  ${RED}[--] $name on :$port (not responding)${NC}"
    all_ok=false
  fi
done

if [[ "$all_ok" != "true" ]]; then
  echo ""
  echo -e "  ${RED}Some services are not running. Start them first:${NC}"
  echo "    bash scripts/start-all.sh"
  exit 1
fi
echo ""
sleep 1

# ── Step 2: On-chain Stats ──
section "  [2/4] On-Chain Network State"
info "  Reading live data from GOAT Testnet3 blockchain..."
echo ""

STATS=$(curl -sf "http://localhost:4022/api/stats" 2>/dev/null || echo '{}')
AGENTS_JSON=$(curl -sf "http://localhost:4022/api/agents" 2>/dev/null || echo '[]')

BLOCK=$(echo "$STATS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).blockHeight||'?')}catch{console.log('?')}})" 2>/dev/null || echo "?")
TOTAL_STAKED=$(echo "$STATS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(Number(JSON.parse(d).totalBtcStaked||0).toFixed(6))}catch{console.log('?')}})" 2>/dev/null || echo "?")
AGENT_COUNT=$(echo "$AGENTS_JSON" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).length)}catch{console.log('?')}})" 2>/dev/null || echo "?")

chain "  Block Height:      $BLOCK"
chain "  Registered Agents: $AGENT_COUNT"
chain "  Total BTC Staked:  $TOTAL_STAKED BTC"
echo ""
echo -e "  ${DIM}Explorer: https://explorer.testnet3.goat.network/block/$BLOCK${NC}"
echo ""
sleep 1

# ── Step 3: Agent Registry ──
section "  [3/4] Agent Registry (ERC-8004 Identities)"
info "  Each agent has an on-chain ERC-721 identity token."
info "  Trust Score = BTC Stake (40%) + Reputation (30%) + Feedback (15%) + Stability (15%)"
echo ""

echo "$AGENTS_JSON" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  try{const agents=JSON.parse(d);
  agents.forEach(a=>{
    const status=a.online?'\x1b[32mONLINE\x1b[0m':'\x1b[31mOFFLINE\x1b[0m';
    const name=(a.name||'').padEnd(15);
    const trust=(a.trustScore||0).toFixed(1).padStart(5);
    const tier=(a.tier||'?').padEnd(10);
    const stake=(a.btcStake||0).toFixed(6);
    const rep=Math.round(a.reputationScore||50);
    console.log('  #'+a.agentId+' '+name+' | Trust: \x1b[33m'+trust+'\x1b[0m ('+tier+') | Stake: \x1b[33m'+stake+' BTC\x1b[0m | Rep: '+rep+'/100 | '+status);
  })}catch{console.log('  (could not parse agent data)')}
});" 2>/dev/null || echo "  (could not parse agent data)"
echo ""
sleep 1

# ── Step 4: x402 Client Demo ──
section "  [4/4] x402 Paid AI Service Calls"
info "  Now running the full payment flow:"
info "  1. Client discovers agents via /info endpoints"
info "  2. Pays each agent via HTTP 402 (x402 protocol + EIP-3009 USDC)"
info "  3. Receives AI service results"
info "  4. Orchestrator routes compound task to sub-agents (Agent-to-Agent payment)"
info "  5. Submits ERC-8004 reputation feedback on-chain after each call"
echo ""
echo -e "  ${DIM}This is the core innovation: AI agents pay each other with BTC-backed trust.${NC}"
echo ""
sleep 1

(cd "$ROOT_DIR/agent" && npx tsx src/client/index.ts)

# ── Summary ──
echo ""
echo -e "${BOLD}${GREEN}"
echo "  ========================================"
echo "  Demo Complete"
echo "  ========================================"
echo -e "${NC}"
echo ""
echo -e "  ${BOLD}Dashboard:${NC} http://localhost:5173"
echo -e "  ${BOLD}Explorer:${NC}  https://explorer.testnet3.goat.network"
echo ""
echo -e "  ${BOLD}What makes BitAgent unique:${NC}"
echo -e "  ${GREEN}*${NC} BTC stake = 40% of trust score (only possible on Bitcoin L2)"
echo -e "  ${GREEN}*${NC} x402 micropayments: AI agents pay each other per-call"
echo -e "  ${GREEN}*${NC} ERC-8004 on-chain identity + reputation"
echo -e "  ${GREEN}*${NC} Slash mechanism: misbehaving agents lose staked BTC"
echo -e "  ${GREEN}*${NC} Orchestrator: Agent-to-Agent paid routing (the strongest demo point)"
echo ""
echo -e "  ${ORANGE}Next: Open the dashboard and try the slash demo!${NC}"
echo -e "  ${DIM}Watch the trust score decrease in real-time when an agent is slashed.${NC}"
echo ""
