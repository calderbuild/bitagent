---
title: "feat: BitAgent 黑客松提交前全面完善"
type: feat
date: 2026-02-24
deepened: 2026-02-24
hackathon: Agent Economy on Bitcoin
deadline: 2026-03-15
demo_day: 2026-03-18
---

# BitAgent 黑客松提交前全面完善

## Enhancement Summary

**Deepened on:** 2026-02-24
**Research agents used:** 17 (architecture, performance, security, simplicity, TypeScript, pattern recognition, agent-native, trust scoring, hackathon strategy, React modal, Hardhat testing, viem typing, x402 protocol, ERC-8004, GOAT Network, AI agent economy, repo analysis)

### Critical Issues Discovered

1. **TrustScore normalization bug** -- demo agents stake 0.000005 BTC, but `score.ts` normalizes by `1e16`, making the 40% BTC stake weight (the project's core thesis) invisible in demo. MUST FIX.
2. **Facilitator performance bottleneck** -- `/api/agents` makes 24 sequential RPC calls, `/api/stats` makes ~31. Dashboard will freeze during demo.
3. **Security: unrestricted `/api/slash` endpoint** -- no auth, CORS `*`, anyone can slash all agents via curl. Judges will notice.
4. **"Try Agent" bypasses x402** -- plan proposes unprotected LLM gateway. Must rate-limit or use cached responses.

### Key Improvements Added

- New **Phase 0** for critical pre-demo fixes (TrustScore, performance, security)
- **Demo narrative structure** grounded in hackathon winner analysis (three-act arc, 5-minute allocation)
- **React modal implementation** using native `<dialog>` + `@starting-style` CSS (no library needed)
- **ERC-8004 test patterns** with complete code (UUPS proxy deployment, EIP-712 signature testing)
- **Trust scoring algorithm** improvements based on Beta Reputation System + EigenLayer patterns
- **Agent-native architecture** gaps identified (no service registry, no schema endpoints, trust breakdown not exposed)

---

## 目标

在 3 月 15 日截止前，将 BitAgent 从"功能完整的原型"打磨为"能拿奖的参赛作品"。聚焦评委最关注的四个维度：**可演示性、技术深度、创新叙事、生态契合度**。

## 背景

### 当前状态

项目核心已完成：4 个 AI Agent + Orchestrator 元 Agent、x402 付费调用、ERC-8004 身份/信誉、BTC 质押 + slash、React Dashboard、一键启动脚本。端到端流程已在 GOAT Testnet3 上验证通过。

### 比赛信息

- 主办：GOAT Network + OpenBuild
- 主题：Agent Economy on Bitcoin（x402 + AI 融合）
- 奖金：~$3,500（一等奖 1000 USDT + Mac Mini，二等奖 500 USDT + Mac Mini，三等奖 2x Mac Mini）
- 时间线：报名 2/14-3/15 | 提交 3/15 | 初审 3/15-16 | Demo Day 3/18 | 结果 3/20
- 生态激励：获胜项目入驻 One Piece Season 5，用户获 GOATED 空投
- 无预设赛道，聚焦 x402 + AI + GOAT Network

### 评分预判（基于同类黑客松通用标准）

| 维度 | 权重 | 当前 | 目标 |
|------|------|------|------|
| 功能完整度 / Demo 效果 | 30% | 7/10 | 9/10 |
| 技术创新 / 难度 | 25% | 8/10 | 9/10 |
| 生态契合度（x402 + BTC + GOAT） | 25% | 9/10 | 10/10 |
| 代码质量 / 可维护性 | 10% | 6/10 | 8/10 |
| 展示质量 / 叙事 | 10% | 4/10 | 9/10 |

### Research Insight: ETHGlobal/Chainlink 获奖者共性

基于 ETHGlobal Bangkok 2024（750K USD 奖池）和 Chainlink Block Magic 2024（18,157 参赛者）的获奖者分析：

1. **窄范围、深执行** -- 解决一个问题做到极致，而非五个问题各做一半
2. **多 sponsor 技术整合** -- 2-3 个 sponsor 技术有意义地使用（BitAgent: x402 + GOAT Network + ERC-8004）
3. **Working prototype** -- 哪怕不完整，也要能跑、能产出结果
4. **Clean repository** -- 好的 commit history、清晰的 README、文档化的 setup
5. **强 demo 视频** -- 3-5 分钟，有旁白，有视觉效果

## 非目标

- 不做生产级安全审计
- 不做多钱包隔离（保持 testnet 共享钱包简化方案）
- 不做 Agent 状态持久化（链上数据够用）
- 不做移动端适配

---

## Phase 0: 关键修复（BLOCKING -- 必须在其他任务之前完成）

> Architecture review 和 performance review 发现的阻塞性问题。不修复则 demo 效果和核心叙事都打折扣。

### 0.1 TrustScore 归一化修复

**问题**：`score.ts` 第 26 行 `Number(input.btcStake) / 1e16` 按主网规模归一化。Demo agents 质押 0.000005 BTC = 5e12 wei，除以 1e16 = 0.0005，乘以 40% 权重后几乎为零。这意味着项目的核心差异化（"BTC stake = 40% of trust"）在 demo 中完全不可见。

**文件**：`agent/src/trust/score.ts`

**改动**：
- [x] 将 `const stakeNormalized = Math.min(Number(input.btcStake) / 1e16, 100)` 改为对数曲线归一化，适配 demo 级质押量
- [x] 参考公式：`Math.min(100, 100 * Math.log2(1 + stakeEther / THRESHOLD) / Math.log2(2))`，THRESHOLD = 0.00001 BTC
- [x] 确保在 demo 范围（0.000005-0.000008 BTC）产生有意义的分数差异（如 60-75 分）

**验收**：DataAnalyst（0.000008 BTC）的 stakeScore 明显高于 CodeAuditor（0.000005 BTC），且两者都在 50-80 分之间

### 0.2 Facilitator API 并行化

**问题**：`/api/agents` 对每个 agent 做 6 次串行网络调用（info, health, stakeInfo, ownerOf, feedbackSummary, trustScore），4 个 agent = 24 次串行调用。`/api/stats` 还要循环 ownerOf(0..20) = ~31 次调用。Dashboard 每 5 秒轮询一次。

**文件**：`agent/src/facilitator/server.ts`

**改动**：
- [x] `/api/agents`：用 `Promise.all` 并行处理 4 个 agent 的数据获取
- [x] 每个 agent 内部的 6 次调用也用 `Promise.allSettled` 并行
- [x] `/api/stats`：缓存 10 秒，避免重复 RPC 调用
- [x] 去掉 `/api/agents` 中重复的 `/health` 调用（已经在 `/info` 请求中包含了）

**验收**：`/api/agents` 响应时间从 >5s 降到 <1s

### 0.3 Slash/Events API 最小安全加固

**问题**：`POST /api/slash` 和 `POST /api/events` 完全无认证，配合 `CORS: *`，任何人可以远程 slash 所有 agent 或注入假事件。

**文件**：`agent/src/facilitator/server.ts`

**改动**：
- [x] 添加简单 bearer token 验证：`if (req.headers.authorization !== 'Bearer ' + process.env.ADMIN_TOKEN)`
- [x] `.env.example` 添加 `ADMIN_TOKEN=your-secret-here`
- [x] 前端 slash 请求带上 token（从环境变量注入或硬编码 demo token）
- [x] 将 CORS 收窄为 `http://localhost:5173`（前端 dev server）

**验收**：无 token 的 curl 请求被拒绝；前端 slash demo 正常工作

### 0.4 Express body size limit

**问题**：`agent.ts` 中 `express.json({ limit: "1mb" })` 允许 1MB body。LLM API 调用费用与输入长度正相关。

**文件**：`agent/src/core/agent.ts`

**改动**：
- [x] 改为 `express.json({ limit: "10kb" })`（一行改动）

**验收**：发送 >10KB body 返回 413

---

## Phase 1: Demo 效果增强（高优先级）

### 1.1 Client Demo 加入 Orchestrator 调用

**问题**：当前 client/index.ts 只调用 3 个 Agent（CodeAuditor, TranslateBot, DataAnalyst），跳过了最有技术含量的 Orchestrator。Orchestrator 是元 Agent，能展示 Agent-to-Agent 付费路由，是核心差异化功能。

**文件**：`agent/src/client/index.ts`

**改动**：
- [x] 在 `SERVICE_CONFIGS` 数组末尾添加 Orchestrator 配置
- [x] ServiceType 联合类型增加 `"orchestrate"`
- [x] 构造一个复合任务 body，如："Audit this contract for reentrancy, then translate the summary to Chinese"
- [x] 更新结束日志为 "all 4 paid calls"
- [x] 输出清晰展示调用链：Client -> Orchestrator -> CodeAuditor -> TranslateBot

**验收**：`run-demo.sh` 输出显示 4 个 Agent 的付费调用 + 链上反馈

#### Research Insight: Agent-to-Agent 是最强 demo 点

Architecture review 建议将 Phase 5.1 (Agent-to-Agent 自主交互) 合并到 Phase 1.1。Orchestrator 展示的 Agent-to-Agent 付费路由是整个项目最独特的功能。demo 中应重点展示调用链 `Client -> Orchestrator -> [CodeAuditor -> TranslateBot]`，并在终端输出中用颜色区分每一跳。

### 1.2 前端 "Try Agent" 交互功能

**问题**：Dashboard 只展示数据和 slash 按钮，评委无法从 UI 直接调用 Agent 服务。缺少"体验感"。

**文件**：`frontend/src/components/AgentCard.tsx`, `frontend/src/components/TryAgentModal.tsx`（新建）, `frontend/src/App.tsx`, `frontend/src/index.css`

**改动**：
- [x] AgentCard 添加 "Try" 按钮（仅 online Agent 可点）
- [x] 新建 TryAgentModal 组件：输入框 + "Call Agent" 按钮 + 结果展示区
- [x] 调用流程：POST 到 Agent 的 service endpoint（绕过 x402，直接调用，Demo 环境可接受）
- [x] 展示：请求耗时、AI 回复内容、Agent ID
- [x] 每个 Agent 预填默认输入（合约代码 / 翻译文本 / 数据集 / 复合任务）

**验收**：评委打开 Dashboard，点 "Try"，输入内容，看到 AI 回复

#### Research Insight: 实现方案

**Modal 组件**：使用原生 `<dialog>` + `showModal()`，React 19 不需要 `forwardRef`。内置 focus trapping、Escape 关闭、backdrop 点击关闭。用 `@starting-style` CSS 实现开关动画（渐进增强，旧浏览器降级为无动画）。

**异步状态**：用 discriminated union 替代布尔标志：

```typescript
type AsyncState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; error: string };
```

**安全注意**：绕过 x402 = 免费 LLM 调用。必须配合 Phase 0.4 (body size limit) 使用。考虑对 "Try" 端点额外限制：每 IP 每分钟 3 次，输入上限 500 字符，LLM max_tokens = 200。或者预缓存 demo 响应，避免实际 LLM 调用。

### 1.3 GOAT Explorer 链接

**问题**：README 和 Dashboard 提到"链上可验证"，但无任何 Explorer 链接。评委无法一键验证。

**文件**：`frontend/src/components/NetworkStatsBar.tsx`, `frontend/src/components/AgentCard.tsx`, `agent/src/client/index.ts`

**改动**：
- [x] NetworkStatsBar 的 Block Height 改为可点击链接：`https://explorer.testnet3.goat.network/block/{blockHeight}`
- [x] AgentCard 钱包地址改为可点击链接：`https://explorer.testnet3.goat.network/address/{wallet}`
- [x] Client Demo 输出的 tx hash 附带 Explorer 链接

**验收**：Dashboard 上所有链上数据都有 Explorer 跳转

### 1.4 前端连接状态指示器

**问题**：前端在 API 不可用时静默降级到 mock 数据，评委可能不知道看到的是真数据还是假数据。

**文件**：`frontend/src/components/NetworkStatsBar.tsx`

**改动**：
- [x] 在 NetworkStatsBar 添加连接状态：绿色 "LIVE" 或橙色 "DEMO MODE"
- [x] `connected` 状态已在 App.tsx 中存在，传递给 NetworkStatsBar 即可

**验收**：连接后端时显示 "LIVE"，断开后显示 "DEMO MODE"

---

## Phase 2: 技术深度补强

### 2.1 TrustScore 单元测试

**问题**：TrustScore 是核心创新点（BTC stake 40% + reputation 30% + feedback 15% + stability 15%），但零测试。评委看代码会觉得不严谨。

**文件**：`agent/src/trust/score.test.ts`（新建）

**改动**：
- [x] 测试各 tier 边界：diamond >= 80, gold >= 60, silver >= 40, bronze >= 20
- [x] 测试零质押 Agent 的分数
- [x] 测试高质押低信誉 vs 低质押高信誉的加权区别
- [x] 测试 slash 后分数下降
- [x] 测试极端值（超大质押、零反馈、大量 slash）
- [x] 测试 demo 级质押量（0.000005-0.000008 BTC）产生合理分数（Phase 0.1 修复后）

**验收**：`npx vitest run agent/src/trust/score.test.ts` 全绿

#### Research Insight: TrustScore 算法改进方向

基于 Beta Reputation System (Josang & Ismail, 2002)、EigenLayer Cost-of-Corruption 模型、Chainlink Oracle Reputation 的研究：

- **当前公式的主要缺陷**：无时间衰减（旧信誉永远有效）、feedback 上限 10 太容易刷满、slash 惩罚无衰减（一次 slash 永远影响）
- **参赛加分改进**（时间允许时）：
  - Logarithmic stake scaling 替代线性（防止鲸鱼主导）
  - Bayesian reputation with exponential decay（信誉自然衰减，防止"信誉银行"攻击）
  - Slash severity tiers + recency weighting（最近的 slash 影响更大）
- **在 README 中引用学术依据**：Beta Reputation System, EigenLayer slashing, ve-tokenomics time multiplier

### 2.2 ERC-8004 合约测试

**问题**：IdentityRegistry 和 ReputationRegistry 是 ERC-8004 实现，声称是核心差异化，但无测试。

**文件**：`contracts/test/IdentityRegistry.test.ts`（新建）, `contracts/test/ReputationRegistry.test.ts`（新建）

**改动**：
- [x] IdentityRegistry 测试：register、setAgentURI、ownerOf、转移后钱包重置
- [x] ReputationRegistry 测试：giveFeedback、getSummary、getClients、revokeFeedback
- [x] UUPS 升级测试：状态在升级后保持、非 owner 无法升级
- [x] 边界条件：valueDecimals > 18 拒绝、value > 1e38 拒绝、空 clientAddresses 拒绝

**验收**：`npx hardhat test` 全绿，测试覆盖两个核心合约

#### Research Insight: UUPS 代理测试关键点

测试代码需要通过 `ERC1967Proxy` 部署（而非 OpenZeppelin hardhat-upgrades 插件），因为项目已有自己的代理部署脚本。关键测试模式：

```typescript
// 部署 implementation -> 编码 initialize -> 部署 ERC1967Proxy -> attach
const impl = await Factory.deploy();
const initData = Factory.interface.encodeFunctionData("initialize", [...]);
const proxy = await ERC1967Proxy.deploy(await impl.getAddress(), initData);
const contract = Factory.attach(await proxy.getAddress());
```

测试 `ReputationRegistryUpgradeable` 时需要先部署 `IdentityRegistryUpgradeable` 代理（ReputationRegistry 的 initialize 需要 identity 地址）。

### 2.3 消除 run-demo.sh 的 Python 依赖

**问题**：`run-demo.sh` 用 `python3` 解析 JSON，不一致（项目是 Node.js 栈），且评委机器可能无 python3。

**文件**：`scripts/run-demo.sh`

**改动**：
- [x] 将所有 `python3 -c "import json..."` 替换为 `node -e "..."`

**验收**：卸载 python3（或 rename）后 `run-demo.sh` 仍正常运行

---

## Phase 3: 代码质量

### 3.1 消除 facilitator/server.ts 中的 any 类型

**问题**：6 处 `as any` / `(args: any)`，代码审查时显得不专业。

**文件**：`agent/src/facilitator/server.ts`

**改动**：
- [x] 为 `combinedClient` 方法参数定义合适的类型（从 `@x402/evm` 导入 `FacilitatorEvmSigner`）
- [x] `/api/agents` 响应对象定义 `AgentInfoResponse` 接口替代 `any[]`
- [x] `/api/stats` 响应定义类型

**验收**：`npx tsc --noEmit` 无 error

#### Research Insight: 正确的类型消除方案

`@x402/evm` v2.3.1 已导出 `FacilitatorEvmSigner` 类型。`combinedClient` 的正确类型是：

```typescript
import { type FacilitatorEvmSigner, toFacilitatorEvmSigner } from "@x402/evm";
type SignerInput = Omit<FacilitatorEvmSigner, "getAddresses"> & { address: `0x${string}` };
```

对于 `readContract`/`writeContract` 等方法参数，`FacilitatorEvmSigner` 定义了自己的窄类型（`{ address, abi, functionName, args? }`），不需要 viem 的泛型。如果 viem 泛型不兼容，在调用点用 `as any` 内部转换（外部类型保持干净）。

### 3.2 代码去重

**问题**：Pattern recognition review 发现 5 处显著代码重复。

**文件**：多个文件

**改动**：
- [x] 提取 `core/crypto-polyfill.ts`：crypto polyfill（从 orchestrator.ts 和 client/index.ts 去重）
- [x] 提取 `core/agents.ts` 中的 `AGENT_REGISTRY`：集中管理 agent 端口/端点/类型（从 server.ts、orchestrator.ts、client/index.ts 三处去重）
- [x] 统一 error-to-string 工具函数：`toErrorMessage` vs `ensureStringError`，保留一个放到 `core/utils.ts`
- [x] 提取 `frontend/src/utils/tier.ts`：tier color mapping（从 AgentCard.tsx 和 TrustLeaderboard.tsx 去重）

**验收**：`npx tsc --noEmit` 无 error，所有功能不变

---

## Phase 4: 展示与叙事

### 4.1 Demo 叙事脚本

**问题**：`run-demo.sh` 纯技术输出，无叙事。评委需要被"讲故事"引导。

**文件**：`scripts/run-demo.sh`

**改动**：
- [x] 在每个步骤前加入清晰的叙事说明（2-3 行，解释"这一步在做什么、为什么重要"）
- [x] 使用 `read -p` 或 `sleep` 在关键步骤间暂停，让评委消化
- [x] 增加颜色输出（绿色=成功，橙色=链上操作，蓝色=说明文字）
- [x] 在结尾输出项目亮点总结和 Explorer/Dashboard 链接
- [x] 重点叙事 Orchestrator 多跳调用链，这是最强 demo 点

**验收**：非技术人员能跟着终端输出理解完整流程

#### Research Insight: 黑客松 Demo 最佳实践

基于 Devpost、ETHGlobal、Chainlink Block Magic 获奖者分析的 demo 结构：

**三幕结构：**
1. **Problem（30-45 秒）**：AI Agent 信任冷启动悖论 -- 需要信誉才能获客，需要客户才能积累信誉
2. **Solution + Live Demo（90-120 秒）**：展示 BTC 质押如何解决 -- 质押即可信，作恶即被 slash
3. **Impact + Vision（30-45 秒）**：只有 Bitcoin L2 能做到 -- ETH L2 没有 BTC 原生资产

**5 分钟时间分配：**

| 段落 | 时长 | 内容 |
|------|------|------|
| Problem + Hook | 0:00-0:45 | 信任冷启动悖论 + 一个统计数据 |
| Solution Overview | 0:45-1:30 | 架构一览：BTC 质押 + x402 + ERC-8004 |
| Live Demo | 1:30-3:30 | 完整 agent 付费调用 + slash + trust score 变化 |
| Technical Highlights | 3:30-4:15 | 2-3 个技术亮点（Orchestrator 多跳、TrustScore 公式、ERC-8004） |
| Impact + Prize Alignment | 4:15-5:00 | 为什么是 GOAT Network、为什么是 BTC、接下来做什么 |

**关键技巧：**
- 使用颜色语义化：绿色=成功，橙色=链上操作，蓝色=说明
- 每个技术术语后跟 "which means..." 的通俗解释
- 明确说明对应的奖项/赛道
- 提前录制完整 demo 视频作为后备

### 4.2 项目提交材料准备

**文件**：根目录下准备

**改动**：
- [ ] 确认 Google Forms 报名已提交
- [ ] 准备 30 秒 elevator pitch（中英文各一版）
- [x] 在 README 顶部添加一句话项目描述 + 核心亮点 bullet points（方便评委快速理解）
- [x] 确保 .env.example 文档齐全，评委能一键跑起来
- [ ] 提前录制一个 3 分钟 demo 视频作为后备（用 asciinema 录制终端 + 屏幕录制 dashboard）
- [ ] Rotate LLM API key 和所有 testnet private keys（提交前）

**验收**：新克隆仓库 -> `cp .env.example .env` -> 填入 key -> `bash scripts/start-all.sh` 能跑

#### Research Insight: 多层 fallback 策略

| Layer | 方案 | 触发条件 |
|-------|------|----------|
| 1 | 实时 live demo | 一切正常 |
| 2 | 预录制 demo 视频（3 分钟） | testnet 不稳定 |
| 3 | 截图 + 架构图演示 | 视频播放也出问题 |
| 4 | 前端 mock 数据 + 口头叙事 | 完全离线 |
| 5 | 指向 GitHub repo + 代码 walkthrough | 最后手段 |

---

## Phase 5: 锦上添花（时间允许时）

### 5.1 Trust Score 分解展示

**问题**：TrustScore 的四维分解（stakeScore, reputationScore, feedbackScore, stabilityScore）在 `score.ts` 中已计算，但 facilitator 只传递 `total` 和 `tier`，分解数据被丢弃。评委无法看到 BTC 质押如何具体影响分数。

**文件**：`agent/src/facilitator/server.ts`, `frontend/src/components/AgentCard.tsx`

**改动**：
- [x] Facilitator `/api/agents` 响应中增加 `trustBreakdown` 字段
- [x] AgentCard 增加 trust score 分解可视化（4 个小进度条或雷达图）

### 5.2 Dashboard 交易详情弹窗

**问题**：Transaction Feed 只显示摘要，无法点击查看详情。

**文件**：`frontend/src/components/TransactionFeed.tsx`

**改动**：
- [x] 点击交易条目展开详情（tx hash + Explorer 链接 + 完整参数）

### 5.3 README 添加架构示意图（Mermaid）

**文件**：`README.md`

**改动**：
- [x] 用 Mermaid 绘制更直观的系统流程图，替代 ASCII art
- [x] 添加 x402 支付流时序图

---

## 风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| GOAT Testnet3 Demo Day 当天不稳定 | Demo 全挂 | 前端 mock 数据降级 + 提前录制 demo 视频 |
| LLM API key 过期或服务不可用 | AI 回复失败 | 准备备用 API key，或在 e2e-local.ts 中用 mock 响应 |
| 共享钱包 nonce 冲突 | 链上交易失败 | start-all.sh 已做 3s 间隔启动，demo 时按顺序操作 |
| 评委不理解 BTC 质押的创新点 | 拿不到高分 | Demo 叙事重点强调：为什么只有 BTC L2 能做这件事 |
| TrustScore 归一化未修复 | 核心叙事（40% BTC weight）不可信 | Phase 0.1 必须完成 |
| Facilitator 响应太慢 | Dashboard 卡顿影响评委体验 | Phase 0.2 并行化必须完成 |
| "Try Agent" 被滥用刷 LLM API | API 费用暴涨 | Rate limit + body size limit + max_tokens 限制 |
| 评委发现 slash 端点无认证 | 扣代码质量分 | Phase 0.3 最小安全加固 |

## 验证方式

1. `bash scripts/start-all.sh` 一键启动 6 个服务
2. `bash scripts/run-demo.sh` 完整流程无错误
3. Dashboard 显示 LIVE 状态 + 4 个 Agent 在线
4. 点击 "Try" 按钮能实时调用 Agent 并看到结果
5. Slash Demo 触发后 Trust Score 实时下降
6. `npx hardhat test` 全绿
7. `npx vitest run` Agent 测试全绿
8. 所有 Explorer 链接可点击跳转
9. TrustScore 在 demo 级质押量下显示有意义的分数差异
10. `/api/agents` 响应时间 < 1 秒

## 任务执行顺序

1. **Phase 0.1 (TrustScore 修复) + Phase 0.4 (body limit)** -- 一行到几行的改动，立即修复核心问题
2. **Phase 0.2 (Facilitator 并行化) + Phase 0.3 (安全加固)** -- 阻塞性性能和安全问题
3. **Phase 1.1 (Orchestrator in client) + Phase 1.4 (连接状态)** -- 快速改动，立即提升 demo 效果
4. **Phase 1.2 (Try Agent Modal)** -- 前端交互是评委体验的核心
5. **Phase 1.3 (Explorer 链接)** -- 链上可验证性的临门一脚
6. **Phase 2.1 (TrustScore 测试) + Phase 2.3 (去 Python 依赖)** -- 小改动大收益
7. **Phase 3.1 (去 any) + Phase 3.2 (代码去重)** -- 代码质量补丁
8. **Phase 2.2 (ERC-8004 测试)** -- 补齐合约测试
9. **Phase 4.1 (Demo 叙事)** -- 贯穿改进完成后，最后打磨叙事
10. **Phase 4.2 (提交材料)** -- 最终检查 + 录制后备视频
11. **Phase 5.x (锦上添花)** -- 时间允许时做
