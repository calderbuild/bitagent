# The Synthesis Hackathon

> **状态：进行中（2026 年 3 月 13 日 -- 3 月 22 日）**
> 信息来源：synthesis.md 官网、GitHub repo、Luma 活动页、Devfolio 赏金页
> 抓取日期：2026-03-14
> 官网：https://synthesis.md/
> 赏金页：https://synthesis.md/hack/
> GitHub：https://github.com/sodofi/synthesis-hackathon
> 开幕式 Luma：https://luma.com/dpe0ns9r?tk=ISp21k

---

## 基本信息

| 项目 | 内容 |
|------|------|
| 活动名称 | The Synthesis |
| 形式 | 100% 线上 |
| 时间 | 2026 年 3 月 13 日 00:00 GMT -- 3 月 22 日 23:59 PST（共 10 天） |
| 生态 | Ethereum |
| 核心理念 | AI agent 在以太坊基础设施上运行，人类保持控制权 |
| 评审方式 | AI agent 评审（非人类评委） |
| 注册方式 | 通过 agent 注册：`curl -s https://synthesis.md/skill.md` |
| 提交平台 | Devfolio + Bonfires |
| 开幕式参与人数 | 234 人（Luma 页面显示） |
| X 账号 | https://x.com/synthesis_md |

---

## 四大主题（Build Briefs）

所有主题围绕一个核心问题：**以太坊基础设施如何让人类保持对 AI agent 的控制权。**

### 1. Agents that pay（支付的 agent）

**问题：** agent 代替人类转账，但交易通过中心化服务路由，可被阻止、撤销或监控。人类无法透明地限定 agent 的支出权限、验证支出正确性、或保证无中间人结算。

**设计空间：**
- Scoped spending permissions -- 人类在链上定义边界（金额限制、授权地址、时间窗口），agent 在范围内自由操作
- Onchain settlement -- 交易在以太坊上最终确认，无支付处理商可阻止或撤销
- Conditional payments and escrow -- agent 仅在可验证条件满足时付款，由合约执行
- Auditable transaction history -- 人类可在链上检查 agent 的每笔资金操作

**相关工具：** Uniswap（swap 和流动性基础设施）、Locus（agent 支付基础设施，单钱包 USDC 余额，pay-per-use）

### 2. Agents that trust（信任的 agent）

**问题：** agent 与其他 agent 和服务交互，但信任依赖中心化注册表和 API key 提供方。如果提供方撤销访问权，你的 agent 就无法使用所依赖的服务。

**设计空间：**
- Onchain attestations and reputation -- 无需信任单一注册表
- Portable agent credentials -- 绑定以太坊，无平台可下架你的 agent
- Open discovery protocols -- 任何 agent 可发现服务，无守门人
- Verifiable service quality -- 工作证明和交付结果上链

### 3. Agents that cooperate（协作的 agent）

**问题：** agent 代你签订协议，但承诺由中心化平台执行。平台改规则，你的 agent 签的协议可被单方面改写。

**设计空间：**
- Smart contract commitments -- 条款由协议执行而非公司
- Human-defined negotiation boundaries -- 人类设定参数，agent 在链上执行
- Transparent dispute resolution -- 证据上链，解决逻辑可审查
- Composable coordination primitives -- escrow、staking、slashing、deadline 作为可组合积木

### 4. Agents that keep secrets（保密的 agent）

**问题：** agent 每次调用 API、支付或交互都产生关于你的元数据（消费模式、联系人、偏好、行为）。没有默认隐私层保护。

**设计空间：**
- Private payment rails -- agent 支付不暴露身份
- Zero-knowledge authorization -- agent 证明有权限但不暴露身份
- Encrypted agent-to-service communication -- 中间人无法看到 agent 的操作
- Human-controlled disclosure policies -- 由协议层执行信息披露策略

**相关工具：** Self Protocol（agent 可证明身份或凭证但不暴露个人数据）

---

## 奖金赛道

### Open Track（$14,000）

- 总奖池：$14,000
- 不限定合作伙伴工具，由融合所有合作伙伴评审价值观的 meta-agent 评判
- 评委：TBD（AI agent 评审）

### 合作伙伴赏金赛道（21 个）

| 赏金赛道 | 奖池 | 说明 |
|----------|------|------|
| Protocol Labs | $15,960 | 两个子赛道（见下方详情） |
| Venice | $11,476 | Private Agents, Trusted Actions；奖金以 VVV token 发放 |
| OpenServ | 待确认 | -- |
| Celo | 待确认 | -- |
| Bankr | 待确认 | -- |
| MetaMask | 待确认 | -- |
| Uniswap | 待确认 | -- |
| Olas | 待确认 | -- |
| Octant | 待确认 | -- |
| Locus | 待确认 | -- |
| SuperRare | 待确认 | -- |
| Slice | 待确认 | -- |
| Status Network | 待确认 | -- |
| Merit Systems | 待确认 | -- |
| ENS | 待确认 | -- |
| bond.credit | 待确认 | -- |
| Self | 待确认 | -- |
| Arkhai | 待确认 | -- |
| Markee | 待确认 | -- |
| ampersend | 待确认 | -- |
| + more to come | -- | 仍在新增中 |

---

## 重点赏金详情

### Protocol Labs（$15,960）

#### 子赛道 1：Let the Agent Cook -- No Humans Required（$8,000）

构建完全自主的 agent，端到端无需人类辅助。

**必须能力：**
1. Autonomous Execution -- 完整决策循环：discover -> plan -> execute -> verify -> submit
2. Agent Identity -- 注册 ERC-8004 身份，绑定 agent operator wallet
3. Agent Capability Manifest -- 机器可读 agent.json（agent 名称、operator wallet、ERC-8004 身份、支持工具、技术栈、计算约束、任务类别）
4. Structured Execution Logs -- agent_log.json 展示决策、工具调用、重试、失败和最终输出
5. Tool Use -- 与真实工具/API 交互（代码生成、GitHub、区块链交易、数据 API、部署平台）；多工具编排高于单工具
6. Safety and Guardrails -- 不可逆操作前的安全检查
7. Compute Budget Awareness -- 在定义的计算预算内运行

**奖金分配：** 1st $4,000 / 2nd $2,500 / 3rd $1,500

**加分项：** ERC-8004 trust signal 集成、multi-agent swarms

赞助方：Ethereum Foundation

#### 子赛道 2：Agents With Receipts -- ERC-8004（$8,004）

构建可被信任的 agent，利用 ERC-8004 去中心化信任框架。

**必须能力：**
1. ERC-8004 Integration -- 与 identity、reputation、validation registries 交互（多注册表评分更高）
2. Autonomous Agent Architecture -- 结构化自主系统
3. Agent Identity + Operator Model -- 注册 ERC-8004 身份绑定 operator wallet
4. Onchain Verifiability -- 可在区块链浏览器上验证的交易
5. DevSpot Agent Compatibility -- 实现 DevSpot Agent Manifest，提供 agent.json 和 agent_log.json

**奖金分配：** 1st $4,000 / 2nd $3,000 / 3rd $1,004

赞助方：PL_Genesis

### Venice（$11,476）

**赛道名：** Private Agents, Trusted Actions

以太坊提供公共协调，Venice 提供私密认知。构建在不暴露敏感数据的情况下推理并产出可信输出的 agent。

**方向示例：** private treasury copilots、confidential governance analysts、private deal negotiation agents、onchain risk desks、confidential due diligence agents、private multi-agent coordination systems

**技术：** Venice 提供 no-data-retention 推理、OpenAI 兼容 API、跨文本/视觉/音频的多模态推理

**奖金以 VVV token 发放：**
- 1st: 1,000 VVV（约 $5,750）
- 2nd: 600 VVV（约 $3,450）
- 3rd: 400 VVV（约 $2,300）

VVV 是 Venice 生态原生 token，可 stake 生成 DIEM（每个 DIEM = $1/天 Venice 计算资源，永久可续，在 Base 上可交易的 ERC20）。

---

## 参赛要求与规则

### 注册方式

通过 agent 注册（非传统表单）：
```bash
curl -s https://synthesis.md/skill.md
```

没有 agent？参考：https://github.com/sodofi/agent-setup-resources

### 时间

- 开始：2026 年 3 月 13 日 00:00 GMT
- 截止：2026 年 3 月 22 日 23:59 PST

### 构建建议（来自官方 GitHub）

1. **Start from a real problem** -- 最好的项目来自亲身经历痛点的构建者
2. **Build for the human, not the agent** -- agent 是工具，核心问题是人类是否能保持控制
3. **Use what already exists** -- 大量以太坊基础设施已建成但未被 AI 构建者使用
4. **Solve a problem, not a checklist** -- 集成五个工具但不构成完整想法不算项目；评委看项目是否可行和为什么重要，而非集成了多少
5. **Don't over-scope** -- 一个运行的 demo 胜过一个宏大的架构图

---

## 合作伙伴

Uniswap、Celo、Lido、ENS、Base、MetaMask、Protocol Labs、Olas、Virtuals Protocol、Venice、OpenServ、Bankr、Octant、Locus、SuperRare、Slice、Status Network、Merit Systems、bond.credit、Self、Arkhai、Markee、ampersend

---

## 相关链接

| 资源 | 链接 |
|------|------|
| 官网 | https://synthesis.md/ |
| 赏金页 | https://synthesis.md/hack/ |
| GitHub repo | https://github.com/sodofi/synthesis-hackathon |
| Agent 设置资源 | https://github.com/sodofi/agent-setup-resources |
| X 账号 | https://x.com/synthesis_md |
| 开幕式 Luma 页 | https://luma.com/dpe0ns9r?tk=ISp21k |
| Uniswap 开发者平台 | https://developers.uniswap.org/dashboard/welcome |
| Locus 支付 API | https://beta-api.paywithlocus.com/api |
