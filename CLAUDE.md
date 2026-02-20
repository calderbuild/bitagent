# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BitAgent is a BTC-secured AI agent service network on GOAT Network (Bitcoin L2, chain ID 48816). Agents stake real BTC, register ERC-8004 identities, and sell services via x402 micropayments (HTTP 402). Three subpackages: `contracts/`, `agent/`, `frontend/`.

## Environment Setup

Copy `.env.example` to `.env` and fill in all values before running anything. Contract addresses are filled after deployment. The `.env` lives at the repo root and is read by the `agent/` subpackage via `process.env`.

Node version: **22+** is required for `frontend/` (Vite 7). Agent services run fine on Node 18+. Use nvm:
```bash
nvm use   # reads .nvmrc
# or for frontend specifically:
PATH=~/.nvm/versions/node/v22.22.0/bin:$PATH npx vite --port 5173
```

## Commands

### Contracts (`cd contracts/`)
```bash
npm run build           # compile Solidity (hardhat compile)
npm test                # run tests (hardhat test)
npm run deploy:testnet  # deploy MockUSDC + StakingVault to GOAT Testnet3
npx hardhat run scripts/deploy-erc8004.ts --network goatTestnet3  # deploy ERC-8004 proxies
npx hardhat run scripts/set-min-stake.ts --network goatTestnet3   # lower minimum stake
npx hardhat run scripts/check-stakes.ts --network goatTestnet3    # inspect on-chain stakes
```

### Agent (`cd agent/`)
Development (with hot reload via tsx):
```bash
npx tsx src/facilitator/server.ts    # x402 facilitator on :4022
npx tsx src/services/code-auditor.ts # AI audit service on :3001
npx tsx src/services/translate-bot.ts # translation service on :3002
npx tsx src/services/data-analyst.ts  # data analysis service on :3003
npx tsx src/client/index.ts          # demo client (makes paid requests)
```

Production (build first):
```bash
npm run build           # tsc -> dist/
npm run start:facilitator
npm run start:auditor
npm run start:client
```

### Frontend (`cd frontend/`)
```bash
npm run dev    # Vite dev server on :5173
npm run build  # TypeScript + Vite build
npm run lint   # eslint
```

## Architecture

### Service startup order
1. `facilitator/server.ts` must start first (agents need it for x402 payment verification)
2. `services/*.ts` -- each agent boots, registers ERC-8004 identity, stakes BTC, then listens
3. `frontend/` connects to facilitator APIs at `http://localhost:4022`

### Agent boot sequence (`agent/src/core/agent.ts`)
`BitAgent.boot()` runs in order: check BTC balance → `registerIdentity()` (scan existing ERC-8004 tokens by name match in tokenURI, register if not found) → `stakeBTC()` (non-fatal, wrapped in try/catch) → start Express server with x402 payment middleware.

Each service (e.g. `code-auditor.ts`) instantiates `BitAgent` with its config and passes a handler function to `boot()`.

### x402 payment flow
- Facilitator at `:4022` handles `/verify` and `/settle` endpoints used by `@x402/express` middleware
- Agents use `paymentMiddleware(routes, resourceServer)` which gates `POST /api/<service>` behind an x402 payment requirement
- Payment token: MockUSDC (6 decimals) on GOAT Testnet3
- Client uses `@x402/fetch` to auto-pay and retry

### Facilitator aggregation APIs (not part of x402 protocol)
These are custom endpoints added for the dashboard:
- `GET /api/agents` -- fetches `/info` + `/health` from each agent port (3001-3003) and enriches with on-chain stake data + trust score
- `GET /api/stats` -- real block height, total staked from StakingVault, agent count from IdentityRegistry
- `POST /api/slash` -- calls `StakingVault.slash()` on-chain; requires deployer wallet (set via `FACILITATOR_KEY`)
- `GET /api/events` -- in-memory event log (resets on restart)

### Trust score (`agent/src/trust/score.ts`)
Composite score 0-100: BTC stake (40%) + ERC-8004 reputation (30%) + feedback count (15%) + slash/uptime stability (15%). Tiers: diamond ≥80, gold ≥60, silver ≥40, bronze ≥20.

### LLM client (`agent/src/core/llm.ts`)
OpenAI-compatible `chatCompletion(systemPrompt, userMessage, maxTokens)`. Configure via env: `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`.

### Contracts
- **MockUSDC** -- ERC-20 with `transferWithAuthorization` (EIP-3009) for x402 pull payments
- **StakingVault** -- agents stake native BTC; admin can `slash(agentId, amount, reason)`; `effectiveStake = amount - slashed`; minimum stake configurable via `setMinimumStake()`
- **IdentityRegistryUpgradeable** -- ERC-721-based ERC-8004 identity; `register(agentURI)` mints token; deployed via UUPS proxy
- **ReputationRegistryUpgradeable** -- ERC-8004 reputation; `giveFeedback()` and `getSummary()`; deployed via UUPS proxy
- Proxy addresses in `.env`: `IDENTITY_REGISTRY_ADDRESS`, `REPUTATION_REGISTRY_ADDRESS`

### Frontend
React 19 + Vite 7, pure CSS (no Tailwind). Polls facilitator APIs every 3-8 seconds. Falls back to `src/data/mock.ts` when API is unavailable (`connected` state flag). All styling in `src/App.css` and `src/index.css`. Component state lives in `App.tsx`; components are presentational.

## Known Constraints

- All testnet agents share a single wallet (`FACILITATOR_KEY`). Each agent is differentiated by its `name` field in the ERC-8004 tokenURI -- `registerIdentity()` scans tokens 0-20 looking for a name match before registering a new one.
- Testnet BTC stakes are micro-amounts (0.000005-0.000008 BTC). The frontend uses 6 decimal places for BTC display.
- StakingVault minimum stake was lowered to 0.000001 BTC via `set-min-stake.ts` on the deployed contract.
- The in-memory event log in the facilitator resets whenever the facilitator process restarts.
