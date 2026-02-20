# Repository Guidelines

## Project Structure & Module Organization
This repository is an npm workspace monorepo:
- `contracts/`: Solidity contracts, Hardhat config, deployment scripts, and contract tests.
- `agent/`: TypeScript backend runtime (facilitator, service agents, trust scoring, demo client).
- `frontend/`: React + Vite dashboard UI.
- `docs/`: planning and design notes.
- Root files: `.env.example` for configuration, `README.md` for architecture and quick start.

Keep feature changes scoped to the relevant workspace. Cross-cutting changes (for example ABI or port updates) should update both `contracts/` and `agent/`.

## Build, Test, and Development Commands
Run from repo root unless noted:
- `npm install`: install all workspace dependencies.
- `npm run build:contracts`: compile Solidity contracts via Hardhat.
- `npm run build:agent`: compile agent TypeScript to `agent/dist`.
- `npm run build:frontend`: type-check and build frontend assets.
- `npm run dev:frontend`: start Vite dev server on `localhost:5173`.
- `npm run test --workspace=contracts`: run contract test suite.
- `cd agent && npm run demo:local`: run local end-to-end agent demo.

## Coding Style & Naming Conventions
- TypeScript is `strict`; prefer explicit types for public interfaces.
- Use 2-space indentation and semicolons in TypeScript/TSX.
- React components: `PascalCase` filenames (for example `AgentCard.tsx`).
- Agent/service modules: descriptive lowercase or kebab-case filenames (for example `code-auditor.ts`).
- Solidity contracts: `PascalCase.sol`, 4-space indentation, SPDX + pragma headers.
- Frontend linting uses ESLint (`cd frontend && npm run lint`).

## Testing Guidelines
- Framework: Hardhat + Mocha/Chai in `contracts/test`.
- Test files follow `*.test.ts` naming (for example `StakingVault.test.ts`).
- Add tests for state changes, access control, and revert conditions when modifying contracts.
- Run `npm run test --workspace=contracts` before opening a PR.

## Commit & Pull Request Guidelines
Use Conventional Commits consistent with project history:
- `feat(scope): ...`, `docs: ...`, `init: ...`.
- Example: `feat(contracts): add slash cooldown guard`.

PRs should include:
- concise summary of user-visible or protocol-impacting changes,
- linked issue/task (if available),
- test evidence (command + result),
- screenshots/GIFs for frontend changes.

## Security & Configuration Tips
- Copy `.env.example` to `.env` and fill testnet-only secrets.
- Never commit private keys, API tokens, or populated `.env` files.
- Validate contract addresses and chain ID (`48816`) before testnet deploys.
