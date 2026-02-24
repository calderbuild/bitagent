# Repository Guidelines

## Project Structure & Module Organization
BitAgent is an npm workspace monorepo:
- `contracts/`: Solidity contracts, Hardhat config, deployment/ops scripts, and tests.
- `agent/`: TypeScript backend runtime (facilitator, paid service agents, orchestrator, demo client).
- `frontend/`: React 19 + Vite dashboard.
- `scripts/`: operator scripts for one-click startup, shutdown, and demo walkthrough.
- `docs/plans/`: implementation plans and checklists.

Keep changes scoped to one workspace when possible. If you touch on-chain interfaces (ABIs, addresses, ports), update both `contracts/` and `agent/`.

## Build, Test, and Development Commands
Run from repo root unless noted:
- `npm install`: install all workspace dependencies.
- `npm run build:contracts`: Hardhat compile for contracts.
- `npm run test --workspace=contracts`: run Solidity tests (`*.test.ts`).
- `npm run build:agent`: compile backend TypeScript.
- `npm run build:frontend`: type-check and build dashboard.
- `bash scripts/start-all.sh`: start facilitator + all agents + frontend.
- `bash scripts/stop-all.sh`: stop all started services.
- `bash scripts/run-demo.sh`: run the full hackathon demo flow.

## Coding Style & Naming Conventions
- TypeScript is strict; avoid `any` unless unavoidable.
- TS/TSX: 2-space indentation, semicolons, explicit interfaces for API payloads.
- React components use `PascalCase` filenames (`AgentCard.tsx`).
- Agent services use kebab-case filenames (`code-auditor.ts`, `orchestrator.ts`).
- Solidity contracts use `PascalCase.sol`, 4-space indentation, SPDX + pragma headers.
- Frontend linting: `cd frontend && npm run lint`.

## Testing Guidelines
- Contracts: Hardhat + Mocha/Chai in `contracts/test`.
- Add tests for access control, revert paths, and state transitions when contract logic changes.
- For backend/frontend changes, validate with:
  1. `bash scripts/start-all.sh`
  2. `bash scripts/run-demo.sh`
  3. Verify API health and dashboard updates.

## Commit & Pull Request Guidelines
Follow Conventional Commits seen in history:
- `feat: ...`, `feat(scope): ...`, `fix: ...`, `docs: ...`.
- Example: `feat(agent): add orchestrator paid routing flow`.

PRs should include:
- concise summary and affected workspace(s),
- test/build evidence (commands + result),
- screenshots or short recordings for UI changes,
- linked issue/task when available.

## Security & Configuration Tips
- Copy `.env.example` to `.env` at repo root; all runtimes read from this file.
- Never commit private keys, API keys, or populated `.env`.
- Confirm GOAT Testnet3 settings before deploy/demo (`chainId 48816`, correct contract addresses).
