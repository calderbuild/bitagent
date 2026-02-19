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
| CodeAuditor | 智能合约安全审计 | 0.01 USDC | 0.005 BTC |
| TranslateBot | 中英翻译 | 0.005 USDC | 0.003 BTC |
| DataAnalyst | 数据分析 | 0.02 USDC | 0.008 BTC |

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

### 编译合约

```bash
npm run build:contracts
```

### 编译 Agent

```bash
npm run build:agent
```

### 运行本地 Demo

本地 Demo 无需 GOAT 测试网连接，在单进程中启动所有组件：

```bash
npm run build:agent
cd agent && npm run demo:local
```

输出示例：

```
BitAgent -- BTC-Secured AI Service Network
Local E2E Demo

[1/3] Starting facilitator...
[Facilitator] Running on port 4022

[2/3] Starting agents...
[CodeAuditor] Listening on port 3001
[TranslateBot] Listening on port 3002
[DataAnalyst] Listening on port 3003

[3/3] Running client demo...
  Step 1: Discovering agents...
  [OK] CodeAuditor at http://localhost:3001
  [OK] TranslateBot at http://localhost:3002
  [OK] DataAnalyst at http://localhost:3003

  Calling CodeAuditor (code-audit)...
  [402] Payment required (x402 protocol active)
  Amount: 10000 | Network: eip155:48816

  Calling TranslateBot (translation)...
  [402] Payment required (x402 protocol active)

  Calling DataAnalyst (data-analysis)...
  [402] Payment required (x402 protocol active)
```

### 启动前端

```bash
npm run dev:frontend
```

访问 http://localhost:5173 查看 Dashboard。

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
```

4. 启动各组件：

```bash
# 终端 1: Facilitator
cd agent && npm run start:facilitator

# 终端 2-4: AI Agent 服务
npm run start:auditor
npm run start:translator
npm run start:analyst

# 终端 5: Client Agent
npm run start:client
```

## 项目结构

```
bitagent/
  contracts/           # Solidity 智能合约
    contracts/
      MockUSDC.sol       # ERC20 + EIP-3009 测试稳定币
      StakingVault.sol   # BTC 质押金库 + slash 机制
    scripts/
      deploy.ts          # Hardhat 部署脚本
  agent/               # TypeScript Agent 运行时
    src/
      core/
        agent.ts           # BitAgent 运行时核心（x402 + Express）
        config.ts          # 链配置 + 合约 ABI
      facilitator/
        server.ts          # 自建 x402 Facilitator（GOAT 支持）
      trust/
        score.ts           # TrustScore 计算模块
      services/
        code-auditor.ts    # 智能合约审计 Agent
        translate-bot.ts   # 中英翻译 Agent
        data-analyst.ts    # 数据分析 Agent
      client/
        index.ts           # 自主 Client Agent
      demo/
        e2e-local.ts       # 本地端到端 Demo
  frontend/            # React Dashboard
    src/
      components/        # UI 组件
      data/              # Mock 数据
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
| CodeAuditor | Smart contract security audit | 0.01 USDC | 0.005 BTC |
| TranslateBot | Chinese-English translation | 0.005 USDC | 0.003 BTC |
| DataAnalyst | Data analysis | 0.02 USDC | 0.008 BTC |

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

### Compile Contracts

```bash
npm run build:contracts
```

### Build Agent

```bash
npm run build:agent
```

### Run Local Demo

The local demo requires no GOAT testnet connection and starts all components in a single process:

```bash
npm run build:agent
cd agent && npm run demo:local
```

### Start Frontend

```bash
npm run dev:frontend
```

Visit http://localhost:5173 to view the Dashboard.

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
```

4. Start each component:

```bash
# Terminal 1: Facilitator
cd agent && npm run start:facilitator

# Terminals 2-4: AI Agent services
npm run start:auditor
npm run start:translator
npm run start:analyst

# Terminal 5: Client Agent
npm run start:client
```

## Project Structure

```
bitagent/
  contracts/           # Solidity smart contracts
    contracts/
      MockUSDC.sol       # ERC20 + EIP-3009 test stablecoin
      StakingVault.sol   # BTC staking vault + slash mechanism
    scripts/
      deploy.ts          # Hardhat deploy script
  agent/               # TypeScript agent runtime
    src/
      core/
        agent.ts           # BitAgent runtime core (x402 + Express)
        config.ts          # Chain config + contract ABIs
      facilitator/
        server.ts          # Self-hosted x402 facilitator (GOAT support)
      trust/
        score.ts           # TrustScore computation module
      services/
        code-auditor.ts    # Smart contract audit agent
        translate-bot.ts   # Chinese-English translation agent
        data-analyst.ts    # Data analysis agent
      client/
        index.ts           # Autonomous client agent
      demo/
        e2e-local.ts       # Local end-to-end demo
  frontend/            # React dashboard
    src/
      components/        # UI components
      data/              # Mock data
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
