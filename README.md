# BitAgent -- BTC-Secured Autonomous AI Service Network

> AI Agent 信任冷启动问题的 Bitcoin 解法

[English](#english) | [中文](#中文)

---

<a id="中文"></a>

## 概述

BitAgent 在 GOAT Network (Bitcoin L2) 上构建 AI Agent 服务网络。每个 Agent 质押 BTC 作为信任担保，通过 x402 协议收费提供 AI 服务，ERC-8004 管理链上身份和信誉。

**核心差异化：BTC 质押解决 Agent 信任冷启动问题 -- 这是只有 Bitcoin L2 才能做到的事。**

## 问题

AI Agent 经济面临根本性矛盾：Agent 需要信誉才能获客，但需要客户才能积累信誉。

现有方案（Conway、NEXUS、Amiko 等）依赖纯信誉系统，新 Agent 零信誉等于零客户，且 Sybil 攻击成本极低。

BitAgent 引入经济博弈层：
- 质押 BTC = 立即可信（不需要等积累信誉）
- 作恶 = 被 slash = 经济损失 > 作恶收益
- Sybil 攻击成本从"几乎免费"变成"需要锁定 BTC"

## 架构

```
                                ERC-8004
                                Identity
                                   |
+----------------+  x402 payment  +--+---------------+   BTC stake   +------------------+
|  Client Agent  | -------------> |  BitAgent Node   | <-----------> |  GOAT Network    |
|  (discovers,   | <-- AI result  |  (AI service +   |   settlement  |  (Bitcoin L2)    |
|   trusts,      |                |   payment gate)  |               |                  |
|   pays)        |  ERC-8004      +--+---------------+               |  StakingVault    |
+----------------+  reputation       |                               |  contract        |
                        |            |                               +------------------+
                        v            v
                 +--------------------+
                 | Reputation Registry|
                 | (feedback + BTC   |
                 |  stake weight)    |
                 +--------------------+
```

### 核心组件

| 组件 | 说明 |
|------|------|
| **StakingVault** | BTC 质押金库，Agent 质押原生 BTC 作为信任担保，支持 slash 机制 |
| **MockUSDC** | 含 EIP-3009 `transferWithAuthorization` 的测试稳定币，供 x402 支付使用 |
| **x402 Facilitator** | 自建 facilitator 服务，支持 GOAT Network 的支付验证和结算 |
| **Agent Runtime** | Express HTTP 服务 + x402 paymentMiddleware，每个 Agent 独立运行 |
| **Client Agent** | 自主发现 Agent、计算 TrustScore、通过 x402 付费调用服务 |
| **TrustScore** | 加权评分：BTC 质押 (40%) + 信誉 (30%) + 反馈密度 (15%) + 稳定性 (15%) |

### Demo Agent 阵容

| Agent | 服务 | 价格 | BTC 质押 |
|-------|------|------|----------|
| CodeAuditor | 智能合约安全审计 | 0.01 USDC | 0.000005 BTC |
| TranslateBot | 中英翻译 | 0.005 USDC | 0.000005 BTC |
| DataAnalyst | 数据分析 | 0.02 USDC | 0.000008 BTC |
| Orchestrator | 元 Agent（路由任务到子 Agent） | 0.03 USDC | 0.000005 BTC |

## 技术栈

| 组件 | 技术 |
|------|------|
| 智能合约 | Solidity 0.8.24 + Hardhat + OpenZeppelin 5.4 |
| Agent Runtime | TypeScript + Node.js + Express |
| 支付协议 | x402 (Coinbase) -- `@x402/core` + `@x402/evm` + `@x402/express` |
| 身份/信誉 | ERC-8004 -- IdentityRegistry + ReputationRegistry |
| BTC 质押 | StakingVault.sol (原生 BTC payable) |
| AI 推理 | Claude API (Anthropic) |
| 前端 | React 19 + TypeScript + Vite 7 |
| 链 | GOAT Network Testnet3 (Chain ID: 48816) |

## 快速开始

### 前置条件

- Node.js >= 22
- npm >= 10

### 安装

```bash
git clone https://github.com/calderbuild/bitagent.git
cd bitagent
npm install
```

### 一键启动（推荐）

```bash
cp .env.example .env
# 编辑 .env 填入私钥和合约地址

bash scripts/start-all.sh
```

这会按正确顺序启动所有 6 个服务（Facilitator -> 4 个 Agent -> Frontend），日志输出到 `logs/` 目录。

启动完成后：
- Dashboard: http://localhost:5173
- 停止所有服务: `bash scripts/stop-all.sh`

### 运行 Demo

```bash
bash scripts/run-demo.sh
```

Demo 脚本会：
1. 检查所有服务健康状态
2. 显示链上统计数据（区块高度、总质押量）
3. 展示 Agent 注册表（信任分、BTC 质押、信誉值）
4. 运行 x402 付费调用 + 链上信誉反馈

### 手动启动（分终端）

```bash
# 终端 1: Facilitator
cd agent && npx tsx src/facilitator/server.ts

# 终端 2-5: AI Agent 服务
npx tsx src/services/code-auditor.ts
npx tsx src/services/translate-bot.ts
npx tsx src/services/data-analyst.ts
npx tsx src/services/orchestrator.ts

# 终端 6: Frontend
cd frontend && npx vite --port 5173

# 终端 7: Client Demo
cd agent && npx tsx src/client/index.ts
```

### Testnet 部署（需要 GOAT BTC）

1. 从 [GOAT Faucet](https://bridge.testnet3.goat.network/faucet) 获取测试 BTC
2. 配置环境变量：

```bash
cp .env.example .env
# 编辑 .env 填入私钥和合约地址
```

3. 部署合约：

```bash
cd contracts
npx hardhat run scripts/deploy.ts --network goatTestnet3
npx hardhat run scripts/deploy-erc8004.ts --network goatTestnet3
```

4. 一键启动：

```bash
bash scripts/start-all.sh
```

## 项目结构

```
bitagent/
  scripts/
    start-all.sh         # 一键启动所有服务
    stop-all.sh          # 一键停止所有服务
    run-demo.sh          # 完整 Demo 流程
  contracts/             # Solidity 智能合约
    contracts/
      MockUSDC.sol         # ERC20 + EIP-3009 测试稳定币
      StakingVault.sol     # BTC 质押金库 + slash 机制
      IdentityRegistryUpgradeable.sol   # ERC-8004 身份注册（UUPS 代理）
      ReputationRegistryUpgradeable.sol # ERC-8004 信誉系统（UUPS 代理）
    scripts/
      deploy.ts            # Hardhat 部署脚本
      deploy-erc8004.ts    # ERC-8004 代理部署
  agent/                 # TypeScript Agent 运行时
    src/
      core/
        agent.ts           # BitAgent 运行时核心（x402 + Express）
        config.ts          # 链配置 + 合约 ABI
        llm.ts             # LLM 客户端（OpenAI 兼容）
      facilitator/
        server.ts          # 自建 x402 Facilitator + 聚合 API
      trust/
        score.ts           # TrustScore 计算模块
      services/
        code-auditor.ts    # 智能合约审计 Agent
        translate-bot.ts   # 中英翻译 Agent
        data-analyst.ts    # 数据分析 Agent
        orchestrator.ts    # 元 Agent（LLM 路由 + 子 Agent 调用）
      client/
        index.ts           # x402 Demo 客户端 + 链上反馈
  frontend/              # React Dashboard
    src/
      components/          # UI 组件（AgentCard, SlashDemo, Leaderboard 等）
      data/                # Mock 数据（API 不可用时降级）
```

## 竞品对比

| 项目 | 链 | x402 | ERC-8004 | BTC 担保 | 信任机制 |
|------|------|------|----------|----------|----------|
| **BitAgent** | **GOAT (BTC L2)** | **Yes** | **Yes** | **Yes** | **BTC 质押 + 信誉** |
| Conway Automaton | Base | Yes | Yes | No | 纯信誉 |
| NEXUS | SKALE | Yes | Yes | No | 纯信誉 |
| Amiko | Solana | Yes | No | No | 链上信用评分 |

## 许可证

MIT

---

<a id="english"></a>

## Overview

BitAgent builds an AI Agent service network on GOAT Network (Bitcoin L2). Each agent stakes BTC as trust collateral, charges for AI services via the x402 protocol, and manages on-chain identity and reputation through ERC-8004.

**Core differentiator: BTC staking solves the agent trust cold-start problem -- something only a Bitcoin L2 can do.**

## Problem

The AI agent economy faces a fundamental paradox: agents need reputation to acquire clients, but need clients to build reputation.

Existing solutions (Conway, NEXUS, Amiko, etc.) rely on pure reputation systems where new agents with zero reputation get zero clients, and Sybil attack costs are negligible.

BitAgent introduces an economic game-theory layer:
- Staking BTC = instant credibility (no need to wait for reputation)
- Misbehavior = slashing = economic loss > misbehavior gains
- Sybil attack cost goes from "nearly free" to "requires locking BTC"

## Architecture

```
                                ERC-8004
                                Identity
                                   |
+----------------+  x402 payment  +--+---------------+   BTC stake   +------------------+
|  Client Agent  | -------------> |  BitAgent Node   | <-----------> |  GOAT Network    |
|  (discovers,   | <-- AI result  |  (AI service +   |   settlement  |  (Bitcoin L2)    |
|   trusts,      |                |   payment gate)  |               |                  |
|   pays)        |  ERC-8004      +--+---------------+               |  StakingVault    |
+----------------+  reputation       |                               |  contract        |
                        |            |                               +------------------+
                        v            v
                 +--------------------+
                 | Reputation Registry|
                 | (feedback + BTC   |
                 |  stake weight)    |
                 +--------------------+
```

### Core Components

| Component | Description |
|-----------|-------------|
| **StakingVault** | BTC staking vault where agents stake native BTC as trust collateral, with slash mechanism |
| **MockUSDC** | Test stablecoin with EIP-3009 `transferWithAuthorization` for x402 payments |
| **x402 Facilitator** | Self-hosted facilitator service supporting GOAT Network payment verification and settlement |
| **Agent Runtime** | Express HTTP service + x402 paymentMiddleware, each agent runs independently |
| **Client Agent** | Autonomously discovers agents, computes TrustScore, pays via x402, and calls services |
| **TrustScore** | Weighted score: BTC stake (40%) + reputation (30%) + feedback density (15%) + stability (15%) |

### Demo Agents

| Agent | Service | Price | BTC Stake |
|-------|---------|-------|-----------|
| CodeAuditor | Smart contract security audit | 0.01 USDC | 0.000005 BTC |
| TranslateBot | Chinese-English translation | 0.005 USDC | 0.000005 BTC |
| DataAnalyst | Data analysis | 0.02 USDC | 0.000008 BTC |
| Orchestrator | Meta-agent (routes tasks to sub-agents) | 0.03 USDC | 0.000005 BTC |

## Tech Stack

| Component | Technology |
|-----------|------------|
| Smart Contracts | Solidity 0.8.24 + Hardhat + OpenZeppelin 5.4 |
| Agent Runtime | TypeScript + Node.js + Express |
| Payment Protocol | x402 (Coinbase) -- `@x402/core` + `@x402/evm` + `@x402/express` |
| Identity/Reputation | ERC-8004 -- IdentityRegistry + ReputationRegistry |
| BTC Staking | StakingVault.sol (native BTC payable) |
| AI Inference | Claude API (Anthropic) |
| Frontend | React 19 + TypeScript + Vite 7 |
| Chain | GOAT Network Testnet3 (Chain ID: 48816) |

## Quick Start

### Prerequisites

- Node.js >= 22
- npm >= 10

### Install

```bash
git clone https://github.com/calderbuild/bitagent.git
cd bitagent
npm install
```

### One-Click Start (Recommended)

```bash
cp .env.example .env
# Edit .env with your private keys and contract addresses

bash scripts/start-all.sh
```

This starts all 6 services in the correct order (Facilitator -> 4 Agents -> Frontend), with logs in `logs/`.

Once running:
- Dashboard: http://localhost:5173
- Stop all: `bash scripts/stop-all.sh`

### Run Demo

```bash
bash scripts/run-demo.sh
```

The demo script will:
1. Health-check all services
2. Display on-chain stats (block height, total staked)
3. Show agent registry (trust scores, BTC stakes, reputation)
4. Run x402 paid calls + on-chain reputation feedback

### Manual Start (Separate Terminals)

```bash
# Terminal 1: Facilitator
cd agent && npx tsx src/facilitator/server.ts

# Terminals 2-5: AI Agent services
npx tsx src/services/code-auditor.ts
npx tsx src/services/translate-bot.ts
npx tsx src/services/data-analyst.ts
npx tsx src/services/orchestrator.ts

# Terminal 6: Frontend
cd frontend && npx vite --port 5173

# Terminal 7: Client Demo
cd agent && npx tsx src/client/index.ts
```

### Testnet Deployment (requires GOAT BTC)

1. Get test BTC from [GOAT Faucet](https://bridge.testnet3.goat.network/faucet)
2. Configure environment variables:

```bash
cp .env.example .env
# Edit .env with your private keys and contract addresses
```

3. Deploy contracts:

```bash
cd contracts
npx hardhat run scripts/deploy.ts --network goatTestnet3
npx hardhat run scripts/deploy-erc8004.ts --network goatTestnet3
```

4. One-click start:

```bash
bash scripts/start-all.sh
```

## Project Structure

```
bitagent/
  scripts/
    start-all.sh         # One-click start all services
    stop-all.sh          # One-click stop all services
    run-demo.sh          # Full demo flow
  contracts/             # Solidity smart contracts
    contracts/
      MockUSDC.sol         # ERC20 + EIP-3009 test stablecoin
      StakingVault.sol     # BTC staking vault + slash mechanism
      IdentityRegistryUpgradeable.sol   # ERC-8004 identity (UUPS proxy)
      ReputationRegistryUpgradeable.sol # ERC-8004 reputation (UUPS proxy)
    scripts/
      deploy.ts            # Hardhat deploy script
      deploy-erc8004.ts    # ERC-8004 proxy deployment
  agent/                 # TypeScript agent runtime
    src/
      core/
        agent.ts           # BitAgent runtime core (x402 + Express)
        config.ts          # Chain config + contract ABIs
        llm.ts             # LLM client (OpenAI-compatible)
      facilitator/
        server.ts          # Self-hosted x402 facilitator + aggregation APIs
      trust/
        score.ts           # TrustScore computation module
      services/
        code-auditor.ts    # Smart contract audit agent
        translate-bot.ts   # Chinese-English translation agent
        data-analyst.ts    # Data analysis agent
        orchestrator.ts    # Meta-agent (LLM routing + sub-agent calls)
      client/
        index.ts           # x402 demo client + on-chain feedback
  frontend/              # React dashboard
    src/
      components/          # UI components (AgentCard, SlashDemo, Leaderboard, etc.)
      data/                # Mock data (fallback when API unavailable)
```

## Competitive Comparison

| Project | Chain | x402 | ERC-8004 | BTC Collateral | Trust Mechanism |
|---------|-------|------|----------|----------------|-----------------|
| **BitAgent** | **GOAT (BTC L2)** | **Yes** | **Yes** | **Yes** | **BTC stake + reputation** |
| Conway Automaton | Base | Yes | Yes | No | Pure reputation |
| NEXUS | SKALE | Yes | Yes | No | Pure reputation |
| Amiko | Solana | Yes | No | No | On-chain credit score |

## License

MIT
