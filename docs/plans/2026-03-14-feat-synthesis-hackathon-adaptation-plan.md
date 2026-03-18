---
title: BitAgent Synthesis Hackathon Adaptation
type: feat
date: 2026-03-14
deepened: 2026-03-14
---

# BitAgent Synthesis Hackathon Adaptation

## Enhancement Summary

**Deepened on:** 2026-03-14
**Research agents used:** 7 (Base Sepolia deployment, ERC-8004 official contracts, Synthesis submission process, x402 compatibility, hackathon winning strategies, hackathon winner analysis, PMF validation)

### Key Improvements
1. 新增竞品分析和 PMF 验证数据（$16.6B 网络犯罪损失、80% 网站无法验证 agent 身份）
2. 新增 ETHGlobal Agentic Ethereum 获奖项目分析（518 个项目，10 个决赛项目）
3. 明确差异化策略：ETH 经济质押 + x402 + ERC-8004 三合一，市场上无竞品
4. 新增 ERC-8183 (Agentic Commerce) 互补标准，可作为加分项
5. 强化叙事框架：从技术展示转向"解决真实问题"

### New Considerations Discovered
- AI agent 评审 = 需要结构化 README（机器可读）
- x402 全球交易量已达 1500 万+，但日均金额仅 $28K -- 说明基础设施在但应用缺失
- ERC-8004 自 2026 年 1 月上 mainnet，仅 401 条反馈 -- 早期窗口仍然开放
- 获奖模式：基础设施 > 消费应用，多 agent 协作 > 单 agent wrapper

---

## Goal

将 BitAgent 适配到 Synthesis Hackathon，部署到 Base Sepolia，投 "Agents With Receipts -- ERC-8004" 赛道（$8,004 奖池）+ Open Track（$14,000 奖池）。截止 3 月 22 日 23:59 PST。

## 为什么 BitAgent 能赢

### 问题是真实的

- 80% 的 AI agent 不正确标识自己；80% 的网站不验证 agent 身份（DataDome 调研，698,000 站点）
- 2026 年 1 月 AI agent "Lobstar Wilde" 单笔交易损失 $250,000 -- 无人检查其信誉
- 60% 的组织无法终止行为异常的 agent；55% 无法隔离 AI 系统
- FBI IC3 记录 2024 年 $16.6B 网络犯罪损失（同比 +33%），AI 增强的社会工程占比持续上升
- Visa 发现暗网中提及 "AI Agent" 的帖子在 6 个月内增长 450%+

### 市场需求已验证

- Agent 经济预计 2030 年达 $3-5 万亿（Nevermined）
- Agent 微支付可寻址市场：2030 年 $3-7B（DWF Labs）
- x402 协议全球交易量 1500 万+（Coinbase + Cloudflare 支撑）
- ERC-8004 2026 年 1 月上线 Ethereum mainnet，由 MetaMask、Ethereum Foundation、Google、Coinbase 联合起草
- Santander + Mastercard 完成欧洲首次端到端 AI agent 支付

### 冷启动问题是公认痛点

> "Payment is the only gate. If an agent can pay, it gets access. No reputation check, no trust verification, no history lookup."

> "The gap between agentic hype and operational reality is widest at the trust layer."

BitAgent 的 ETH 质押直接解决冷启动：新 agent 从第一天就有经济担保，不需要历史交易积累信誉。

### 竞品分析

| 方案 | 做法 | BitAgent 填补的空白 |
|------|------|---------------------|
| ClawTrust | 中心化信任评分 | 中心化；无经济博弈 |
| AgentScore | 多源聚合评分 | 只读评分；无执行机制 |
| DataDome Agent Trust | Bot 检测 + 行为分析 | 企业 SaaS；不解决 agent-to-agent 信任 |
| Visa/Mastercard | 代币化 + agent 注册 | 传统支付轨道；非 crypto-native |
| Coinbase Agentic Wallets | x402 + 链上钱包 | 无信誉/信任层；只有支付能力 |

**BitAgent 的独特位置：x402 支付 + ERC-8004 身份 + ETH 质押/slash 三合一。市场上无竞品同时统一这三者。**

---

## 从获奖项目学到的模式

### ETHGlobal Agentic Ethereum（518 个项目，10 个决赛）

关键发现：

1. **基础设施 > 消费应用** -- SecretAgent（密钥管理）、Synapze（agent 托管）拿到决赛名额。Meme generator 一个都没进
2. **多 agent 协作 > 单 agent wrapper** -- Nimble（agents 竞价最优 swap）、BouncerAI（并行评分 agents）、PvPvAI（agents 辩论）都强调 agent 间交互
3. **真实经济利益 > 概念验证** -- 获奖项目都有真实的资金流动（质押、swap、代币购买门控）
4. **选一个生态深入** -- 大部分获奖者深度集成 Coinbase AgentKit + Base，而非泛泛的"chain-agnostic"

### BitAgent 的对标定位

BitAgent 最接近 **Nimble**（多 agent 经济网络 + 真实资金）和 **SecretAgent**（基础设施解决真实痛点），但独特之处在于：
- Nimble 做的是 swap 路由优化，BitAgent 做的是 **信任基础设施**
- SecretAgent 解决密钥管理，BitAgent 解决 **信誉管理**
- 没有任何决赛项目做了 **质押 + slash + 信誉 + 支付** 的完整闭环

---

## Scope

### In

- 链配置迁移（GOAT → Base Sepolia）
- 合约部署到 Base Sepolia（StakingVault + MockUSDC + ERC-8004 proxies）
- Synthesis 注册（API 注册获取 on-chain ERC-8004 身份 + API key）
- 叙事重写（面向"解决真实问题"而非技术展示）
- README 重写（结构化，兼顾 AI 评审和人类评审）
- 与官方 ERC-8004 合约交互（读取/对比）
- 项目提交到 Devfolio

### Out

- 合约逻辑修改（已经 chain-agnostic）
- 大规模新功能开发
- 前端大改（仅改 explorer 链接和网络名称）
- TEE 集成（加分项但时间不够）

## Risk

| 风险 | 影响 | 缓解 |
|------|------|------|
| Base Sepolia 部署失败 | 无法演示链上交互 | 合约已在 GOAT 上验证过，Solidity 逻辑不变 |
| 提交入口未开放 | 无法按时提交 | 先注册拿 API key，skill.md 说"即将开放" |
| 项目看起来"提前做好的" | 评委扣分 | conversationLog 展示迁移过程；git history 显示迭代 |
| AI 评审无法理解项目 | 低分 | README 结构化（问题/方案/技术/验证），方便 LLM 解析 |
| x402 在 Base 上行为不同 | 支付流程异常 | x402 是 EVM-agnostic，Coinbase/Cloudflare 已验证 |

## Compatibility

- 保留 GOAT Network 配置作为备选（hardhat 多网络配置）
- .env 改为通用命名，两个 hackathon 可以切换

---

## 关键技术信息

### Synthesis Hackathon

- 时间：2026-03-13 00:00 GMT -- 2026-03-22 23:59 PST
- 生态：Ethereum（Base Mainnet 为官方 ERC-8004 链）
- 注册 API：`POST https://synthesis.devfolio.co/register`
- 提交平台：Devfolio
- 评审：AI agent 评审 + 人类评审
- 提交规则：开源、有工作 demo、agent 必须是真正参与者、链上交互越多越好、需要 conversationLog

### 目标赛道

**Primary: "Agents With Receipts -- ERC-8004"**（Protocol Labs 赞助，$8,004）

必须能力：
1. ERC-8004 Integration -- 与 identity、reputation registries 交互 --> BitAgent: IdentityRegistry + ReputationRegistry + TrustScore
2. Autonomous Agent Architecture -- 结构化自主系统 --> BitAgent: boot sequence + x402 middleware + orchestrator
3. Agent Identity + Operator Model -- ERC-8004 身份绑定 operator wallet --> BitAgent: ERC-721 token + agentWallet metadata
4. Onchain Verifiability -- 链上浏览器可验证 --> BitAgent: 所有交易在 Basescan 可查

**Secondary: Open Track**（$14,000 community prize）

**Bonus targets:**
- "Agents that trust" 主题 -- 核心匹配
- "Agents that pay" 主题 -- x402 支付匹配
- "Agents that cooperate" 主题 -- Orchestrator + slash 匹配

### 官方 ERC-8004 合约地址

| 链 | IdentityRegistry | ReputationRegistry |
|----|------------------|--------------------|
| Base Mainnet | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |
| Base Sepolia | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

### 链迁移范围

代码分析结果：所有 chain-specific 代码集中在配置层，合约和业务逻辑 100% chain-agnostic。

| 组件 | 文件 | 改动类型 |
|------|------|----------|
| Hardhat config | `contracts/hardhat.config.ts` | 添加 baseSepolia 网络 |
| Agent config | `agent/src/core/config.ts` | 变量名 GOAT->通用 + 默认值改 Base |
| Facilitator | `agent/src/facilitator/server.ts` | viem chain 定义改 Base |
| Agent boot | `agent/src/core/agent.ts` | 引用新 config 常量 |
| Client | `agent/src/client/index.ts` | 引用新 config 常量 + explorer URL |
| Orchestrator | `agent/src/services/orchestrator.ts` | 引用新 config 常量 |
| Frontend explorer | 4 个组件文件 | explorer URL 改 basescan |
| Frontend network name | `NetworkStatsBar.tsx` | "GOAT Network" -> "Base Sepolia" |
| Mock data | `frontend/src/data/mock.ts` | chainId 48816 -> 84532 |
| .env.example | 根目录 | 变量名 + 默认值 |
| StakingVault 注释 | `contracts/contracts/StakingVault.sol` | "BTC" -> "ETH"（仅注释） |

### ERC-8183 互补标准（加分项）

ERC-8183 "Agentic Commerce" 由 Virtuals Protocol + Ethereum Foundation 起草：
- 开放框架让 agents 和 users 使用链上 escrow + evaluator 验证来协调交易
- ERC-8004 处理 discovery/trust，ERC-8183 处理 transactional activity
- 每个完成的任务产生可验证记录，喂入 ERC-8004 信誉系统

如果时间允许，可以在提交文档中提及 BitAgent 的 x402 + slash 机制与 ERC-8183 的 escrow + evaluator 模式的互补性。

---

## Task List

### Phase 0: 注册 Synthesis（立即执行）

**Task 0.1: API 注册**
- 描述：调用 `POST https://synthesis.devfolio.co/register` 注册 BitAgent
- 文件：无代码改动，curl 命令
- 约束：需要准备 humanInfo 信息
- 验收：获得 `apiKey`、`participantId`、`teamId`、`registrationTxn`（Base Mainnet 上的 ERC-8004 身份）

```bash
curl -X POST https://synthesis.devfolio.co/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "BitAgent",
    "description": "Trust infrastructure for AI agents. Stake ETH as collateral, get slashed for misbehavior. ERC-8004 identity + reputation, x402 micropayments, transparent trust scoring. Solving the agent cold-start trust problem.",
    "agentHarness": "claude-code",
    "model": "claude-opus-4-6",
    "humanInfo": {
      "name": "<YOUR_NAME>",
      "email": "<YOUR_EMAIL>",
      "background": "Full-stack blockchain developer building AI agent trust infrastructure on Ethereum",
      "cryptoExperience": "EVM, Solidity, x402 protocol, ERC-8004, UUPS proxies, viem/ethers.js",
      "aiAgentExperience": "Autonomous AI agents with on-chain identity, payment, and reputation capabilities",
      "codingComfort": 9,
      "problemToSolve": "80% of AI agents dont identify themselves, 80% of websites cant verify agent identity. New agents have zero trust. BitAgent solves cold-start trust: stake ETH as collateral, ERC-8004 on-chain reputation, x402 pay-per-call, slash for misbehavior."
    }
  }'
```

- 关键：保存返回的 `apiKey`（只显示一次）
- 注意：注册会在 Base Mainnet 官方 ERC-8004 合约上创建链上身份

### Phase 1: 链配置迁移（2-3 小时）

**Task 1.1: 环境变量通用化**
- 描述：将 GOAT 特定的环境变量名改为通用名
- 文件：`.env.example`, `.env`
- 约束：保持向后兼容，旧变量名可作为 fallback
- 验收：`.env.example` 包含 `CHAIN_RPC_URL`, `CHAIN_ID` 等通用名

```
# Before
GOAT_RPC_URL=https://rpc.testnet3.goat.network
GOAT_CHAIN_ID=48816

# After
CHAIN_RPC_URL=https://sepolia.base.org
CHAIN_ID=84532
EXPLORER_URL=https://sepolia.basescan.org
NETWORK_NAME=Base Sepolia
NATIVE_SYMBOL=ETH
```

**Task 1.2: Agent config.ts 重构**
- 描述：将 `GOAT_RPC`, `GOAT_CHAIN_ID`, `GOAT_NETWORK` 改为通用常量
- 文件：`agent/src/core/config.ts`
- 约束：所有引用方（agent.ts, server.ts, client/index.ts, orchestrator.ts）需同步更新
- 验收：`grep -r "GOAT" agent/src/` 无结果（除注释外）

### Research Insight
> 从 config.ts 导出 EXPLORER_URL 和 NETWORK_NAME，前端通过 facilitator /api/stats 读取，避免前端硬编码。这样切换链只需改 .env。

**Task 1.3: Hardhat 添加 Base Sepolia 网络**
- 描述：在 hardhat.config.ts 中添加 `baseSepolia` 网络配置
- 文件：`contracts/hardhat.config.ts`
- 约束：保留 `goatTestnet3` 配置不删除
- 验收：`npx hardhat compile` 成功

```typescript
baseSepolia: {
  url: "https://sepolia.base.org",
  chainId: 84532,
  accounts: [process.env.DEPLOYER_KEY!],
},
```

**Task 1.4: Facilitator viem chain 定义**
- 描述：将 `goatTestnet3` chain 定义改为从 config 读取，默认 Base Sepolia
- 文件：`agent/src/facilitator/server.ts`
- 约束：nativeCurrency 改为 ETH
- 验收：Facilitator 启动时连接 Base Sepolia RPC

**Task 1.5: 前端 explorer 链接和网络名称**
- 描述：前端从 facilitator /api/stats 读取 explorer URL 和 network name，不再硬编码
- 文件：`AgentCard.tsx`, `TrustLeaderboard.tsx`, `TransactionFeed.tsx`, `NetworkStatsBar.tsx`, `mock.ts`
- 约束：fallback 到 `https://sepolia.basescan.org`
- 验收：前端所有链接指向 basescan

### Phase 2: 合约部署到 Base Sepolia（1-2 小时）

**Task 2.1: 获取 Base Sepolia ETH**
- 描述：通过 faucet 获取测试 ETH
- 文件：无
- 约束：需要足够 ETH 部署 4 个合约 + 质押
- 验收：钱包有 >= 0.1 ETH
- Faucet 选项：https://www.alchemy.com/faucets/base-sepolia 或 https://faucet.quicknode.com/base/sepolia

**Task 2.2: 部署 MockUSDC + StakingVault**
- 描述：运行部署脚本到 Base Sepolia
- 文件：`contracts/scripts/deploy.ts`
- 约束：使用 `--network baseSepolia`
- 验收：合约地址写入 .env

```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
```

**Task 2.3: 部署 ERC-8004 Proxies**
- 描述：部署 IdentityRegistryUpgradeable + ReputationRegistryUpgradeable 到 Base Sepolia
- 文件：`contracts/scripts/deploy-erc8004.ts`
- 约束：使用 UUPS proxy 模式
- 验收：合约地址写入 .env

**ERC-8004 策略决定：选项 C（两者都用）**

理由：
1. Synthesis 注册 API 已在 Base Mainnet 官方合约上创建了 BitAgent 的 ERC-8004 身份 -- 这证明我们理解并使用官方标准
2. 自部署合约用于业务演示（质押绑定、信誉反馈、TrustScore 计算） -- 展示深度集成能力
3. 在 README 中明确说明："BitAgent 在官方 ERC-8004 注册身份，并扩展了 staking + slash + composite trust score"

**Task 2.4: 设置最低质押额**
- 描述：调用 `setMinimumStake()` 降低最低质押到 0.000001 ETH
- 文件：`contracts/scripts/set-min-stake.ts`
- 约束：使用 `--network baseSepolia`
- 验收：`checkStakes` 确认最低质押已更新

**Task 2.5: 合约验证（加分项）**
- 描述：在 Basescan 上验证合约源码
- 文件：hardhat.config.ts 添加 etherscan API key
- 约束：需要 Basescan API key（免费注册）
- 验收：合约在 Basescan 上显示绿色 checkmark

### Research Insight
> "On-chain artifacts = stronger submission" -- Synthesis 规则明确说链上交互越多越好。验证合约源码让评委直接在 Basescan 阅读代码，大幅提升可信度。

### Phase 3: 端到端验证（1-2 小时）

**Task 3.1: 启动 Facilitator + 3 Agent 服务**
- 描述：用新配置启动所有服务，验证 x402 支付流程
- 文件：无改动
- 约束：.env 必须指向 Base Sepolia
- 验收：Client demo 完整运行（注册身份 -> 质押 -> 调用服务 -> 付费 -> 获取结果 -> 提交反馈）

**Task 3.2: 前端 Dashboard 验证**
- 描述：启动前端，确认所有链上数据正确显示
- 文件：无改动
- 约束：LIVE 模式连接 Base Sepolia
- 验收：Agent 卡片显示正确 explorer 链接，区块高度来自 Base Sepolia

**Task 3.3: 合约测试**
- 描述：运行合约测试确认无回归
- 文件：无改动
- 验收：57 tests passing

**Task 3.4: Playwright 截图 + 录屏**
- 描述：用 Playwright 截取 Dashboard 各页面截图，用于 Devfolio 提交
- 文件：截图保存到 `docs/screenshots/`
- 验收：至少 4 张截图（Dashboard 全景、Agent 信任详情、x402 交易记录、Slash 演示）

### Phase 4: 叙事与文档适配（2-3 小时）

**Task 4.1: README 重写**
- 描述：从技术展示转向"解决真实问题"叙事
- 文件：`README.md`
- 约束：结构化格式（兼顾 AI 评审 + 人类评审），英文为主
- 验收：README 清晰传达问题 -> 方案 -> 为什么用区块链 -> 技术架构

### Research Insight: 叙事框架

不要说 "我们建了一个平台"。说 "80% 的网站无法验证 AI agent 身份，每年 $16.6B 网络犯罪损失。BitAgent 用 ETH 质押解决信任冷启动。"

**README 结构（面向 AI 评审优化）：**

```markdown
# BitAgent -- Trust Infrastructure for Autonomous AI Agents

## Problem
[2-3 sentences with data points -- 80% stat, $250K loss incident, cold start paradox]

## Solution
[1 paragraph: stake ETH -> ERC-8004 identity -> x402 payments -> slash for misbehavior]

## How It Works
[Mermaid diagram: Client -> Agent -> Facilitator -> Chain]

## Why Blockchain?
[3 bullet points: verifiable trust, permissionless discovery, economic accountability]

## Architecture
[Technical breakdown: contracts, agent runtime, x402 flow, trust score formula]

## Live Demo
[Screenshots + links to Basescan transactions]

## ERC-8004 Integration
[Explicit mapping to bounty requirements]

## Getting Started
[Quick start commands]
```

**Task 4.2: 合约注释更新**
- 描述：StakingVault.sol 注释中 "BTC" -> "ETH"，"GOAT Network" -> "Base"
- 文件：`contracts/contracts/StakingVault.sol`
- 约束：仅改注释，不改逻辑
- 验收：注释准确描述 Base 上的行为

**Task 4.3: CLAUDE.md 更新**
- 描述：更新项目说明以反映 Base Sepolia 部署
- 文件：`CLAUDE.md`
- 验收：新开发者能理解当前部署目标

**Task 4.4: Synthesis 提交文档**
- 描述：准备 Devfolio 提交所需的项目描述
- 文件：新建 `docs/synthesis-submission.md`
- 约束：突出 ERC-8004 Integration + Autonomous Agent Architecture + Real Problem
- 验收：覆盖 "Agents With Receipts" 赛道全部 4 项必须能力

**提交文档核心内容：**

> **One-liner:** BitAgent is trust infrastructure for AI agents -- stake ETH, get an ERC-8004 identity, serve via x402, get slashed for misbehavior.
>
> **Problem:** 80% of AI agents don't properly identify themselves. New agents face a cold-start trust paradox: they need reputation to get clients, but need clients to build reputation. The result? Payment is the only gate -- if an agent can pay, it gets access, with zero trust verification.
>
> **Solution:** BitAgent requires agents to stake ETH as trust collateral. This creates immediate economic accountability: misbehave and lose your stake. Combined with ERC-8004 on-chain identity and reputation, and x402 pay-per-call micropayments, BitAgent provides the complete trust layer that autonomous agent commerce needs.
>
> **Why this needs Ethereum:** Verifiable trust requires a neutral, permissionless ledger. Staking must be credible (real economic value at risk). Identity must be portable (not locked to any platform). Settlement must be final (no chargebacks from AI agents). Only Ethereum infrastructure delivers all four.

**ERC-8004 赛道逐项对应：**

1. **ERC-8004 Integration**
   - IdentityRegistryUpgradeable: Agent 注册获得 ERC-721 token + agentWallet metadata
   - ReputationRegistryUpgradeable: 客户提交结构化反馈（score 1-5 + comment）
   - TrustScore: 复合评分 0-100（stake 40% + reputation 30% + feedback 15% + stability 15%）
   - 与官方合约的关系：Synthesis 注册创建了官方 ERC-8004 身份；BitAgent 扩展了 staking + slash + composite score

2. **Autonomous Agent Architecture**
   - `BitAgent.boot()`: 检查余额 -> 扫描 ERC-8004 tokens -> 注册身份 -> 质押 ETH -> 启动 Express + x402 middleware
   - 每个 agent 是独立进程，自主完成全部链上操作
   - Orchestrator 元 agent 自主选择子 agent 并级联付费

3. **Agent Identity + Operator Model**
   - 每个 agent 绑定一个 ERC-8004 token（ERC-721）
   - tokenURI 包含 agent 名称和描述
   - agentWallet metadata 绑定 operator wallet address
   - 身份在链上持久存在，不依赖任何中心化注册表

4. **Onchain Verifiability**
   - 质押交易：`StakingVault.stake()` -- Basescan 可查
   - 身份注册：`IdentityRegistry.register()` -- Basescan 可查
   - 信誉反馈：`ReputationRegistry.giveFeedback()` -- Basescan 可查
   - Slash 惩罚：`StakingVault.slash()` -- Basescan 可查
   - x402 支付结算：`MockUSDC.transferWithAuthorization()` -- Basescan 可查

**Task 4.5: conversationLog 记录**
- 描述：Synthesis 要求记录 human-agent 协作过程
- 文件：新建 `docs/conversation-log.md`
- 约束：展示 brainstorm、pivot、breakthrough
- 验收：有实质内容展示协作过程

### Research Insight
> conversationLog 是评分标准之一。记录要真实：展示从 "Bitcoin agent economy" pivot 到 "Ethereum trust infrastructure" 的决策过程，展示调研竞品和 PMF 验证的思考，展示链迁移的技术决策。不要写成流水账。

### Phase 5: 注册 + 提交

**Task 5.1: 执行注册 API 调用**
- 描述：手动执行 Phase 0 的 curl 命令
- 验收：获得 API key 和 registrationTxn

**Task 5.2: 确认 GitHub 仓库公开**
- 描述：Synthesis 要求 open source
- 验收：https://github.com/calderbuild/bitagent 设为 public

**Task 5.3: 推送代码到 GitHub**
- 描述：合并 feat/hackathon-polish 到 main，推送所有改动
- 验收：GitHub main 分支包含完整代码

**Task 5.4: Devfolio 项目提交**
- 描述：通过 Synthesis API 或 Devfolio 网页提交项目
- 约束：提交入口尚未开放（截至 3/14），持续关注 skill.md 更新
- 验收：提交成功并收到确认

---

## 差异化策略总结

### 为什么 BitAgent 不是"又一个 agent 平台"

| 维度 | 常见做法 | BitAgent 做法 |
|------|----------|---------------|
| 信任来源 | 纯信誉系统（零分冷启动） | ETH 质押 = 立即可信 |
| 支付方式 | 传统 API key + 月费 | x402 per-call 微支付（HTTP 原生） |
| 身份管理 | 中心化注册表 | ERC-8004 链上身份（portable） |
| 问责机制 | 封号/降级 | 经济 slash（真实损失 > 作恶收益） |
| Agent 协作 | 手动路由 | Orchestrator 自主选择 + 级联付费 |
| 评分透明度 | 黑箱算法 | 公式公开（stake 40% + reputation 30% + feedback 15% + stability 15%） |

### 一句话差异化

> "BitAgent is the first project to unify ERC-8004 identity, x402 payments, and economic staking/slashing into a single trust layer for autonomous AI agents."

---

## 时间线

| 日期 | 任务 | 预计时间 |
|------|------|----------|
| 3/14（今天） | Phase 0: 注册 + Phase 1: 链配置迁移 | 3-4h |
| 3/15 | Phase 2: 合约部署 + Phase 3: 端到端验证 | 2-3h |
| 3/16-17 | Phase 4: 叙事重写 + 提交文档 + conversationLog | 3-4h |
| 3/18-21 | 缓冲时间 + 提交入口开放后提交 | 1-2h |
| 3/22 | 截止日（23:59 PST）-- 确保已提交 | -- |

总预计工作量：10-13 小时，分布在 8 天内。

---

## 参考

### 项目参考
- Synthesis 官网：https://synthesis.md/
- 注册 API：https://synthesis.md/skill.md
- GitHub：https://github.com/sodofi/synthesis-hackathon
- 赏金页：https://synthesis.md/hack/
- 本地信息文件：`synthesis-hackathon/Synthesis-Hackathon-完整信息.md`
- 已完成的 GOAT 黑客松 plan：`docs/plans/2026-02-24-feat-bitagent-hackathon-polish-plan.md`

### 市场数据引用
- DataDome agent identity crisis: 80% 的 AI agent 不正确标识自己
- FBI IC3 2024: $16.6B 网络犯罪损失
- Visa PERC: 暗网 "AI Agent" 帖子 450%+ 增长
- DWF Labs: Agent 微支付可寻址市场 $3-7B by 2030
- x402.org: 1500 万+ 全球交易量
- ERC-8004 上线 Ethereum mainnet: 2026-01-29

### 竞品参考
- ETHGlobal Agentic Ethereum: 518 项目, 10 决赛
- Nimble (finalist): 多 agent 竞价网络
- SecretAgent (finalist): Agent 密钥管理基础设施
- AgentStore: 开源 agent 市场（ERC-8004 + x402）
- ERC-8183: Agentic Commerce 标准（互补）
