---
title: Agent Economy on Bitcoin Hackathon Submission
type: feat
date: 2026-03-12
---

# Hackathon Submission Checklist

## Overview

BitAgent 代码已全部完成（9 commits on `feat/hackathon-polish`），现在需要完成提交流程。截止日期 3 月 15 日，Demo Day 3 月 18 日。

## 当前状态

- 合约测试：57 passing
- Agent 测试：20 passing
- TypeScript 编译：0 errors
- 前端 Dashboard：全功能运行（LIVE/DEMO 双模式）
- 分支：`feat/hackathon-polish`，9 commits ahead of `main`
- Remote：`git@github.com:calderbuild/bitagent.git`，`main` 已推送，`feat/hackathon-polish` 未推送

## Task 1: 合并代码到 main 并推送

把 `feat/hackathon-polish` 合并到 `main` 并推送到 GitHub，让评委能看到完整代码。

```bash
git checkout main
git merge feat/hackathon-polish
git push origin main
```

验证：GitHub repo 显示最新 commit `73021c3`。

## Task 2: 确认 Google Forms 注册

报名入口：https://forms.gle/sARuD71DYWKiFScj9

需要填写的信息（推测）：
- 项目名称：BitAgent
- 团队/个人信息
- 项目简介：BTC 质押驱动的 AI Agent 可信服务市场
- GitHub 仓库链接：https://github.com/calderbuild/bitagent
- 技术栈：x402 + ERC-8004 + GOAT Network + Solidity + TypeScript + React

**这是手动任务，需要你自己填写提交。**

## Task 3: 准备 Demo Day 演示（3 月 18 日）

### 30 秒电梯 Pitch

> BitAgent 解决 AI Agent 信任冷启动问题。新 Agent 质押 BTC 立即可信，x402 协议按次收费，作恶即 slash -- 在 GOAT Network 上用 Bitcoin 经济博弈替代纯信誉系统。

### Demo 演示流程（建议 3 分钟）

1. **问题引入**（30s）：AI Agent 需要信誉才能获客，但需要客户才能积累信誉 -- 冷启动悖论
2. **Dashboard 展示**（60s）：打开前端，展示 4 个 Agent 的信任评分、BTC 质押、链上身份
3. **x402 付费调用**（45s）：运行 client demo，展示 HTTP 402 -> 自动付费 -> AI 返回结果
4. **Slash 演示**（30s）：在 Dashboard 执行 slash，观察信任分和质押即时变化
5. **总结**（15s）：BTC 质押 = 信任锚点，x402 = 无中介支付，ERC-8004 = 链上信誉

### 录制备份视频

如果 Demo Day 是线上直播，建议提前录一个备份视频：
- 终端操作用 asciinema 录制
- Dashboard 用 OBS 或系统屏幕录制
- 合并为 3 分钟视频

## Task 4: 安全清理（提交前）

- [ ] 确认 `.env` 在 `.gitignore` 中（不要提交私钥）
- [ ] 确认 `.env.example` 不含真实密钥
- [ ] 提交后考虑轮换 LLM API Key 和测试网私钥

## Task 5: README 最终检查

确认 README 包含：
- [ ] 项目一句话介绍
- [ ] 问题定义 + 解决方案
- [ ] 架构图（Mermaid）
- [ ] 快速启动步骤
- [ ] 技术栈说明（x402 / ERC-8004 / GOAT Network）
- [ ] 演示截图或 GIF（可选但加分）

## 时间线

| 日期 | 事项 |
|------|------|
| 3/12（今天）| 合并代码、推送 GitHub、确认注册 |
| 3/13-14 | 录制备份 demo 视频、练习 pitch |
| 3/15 | 截止日 -- 确保代码和注册都已提交 |
| 3/15-16 | 项目初审 |
| 3/18 | Demo Day（线上） |
| 3/20 | 结果公布 |

## 风险

1. **Google Forms 未提交** -- 最大风险，代码再好也白费。今天必须确认。
2. **GitHub 仓库未公开** -- 评委需要能看到代码。确认 repo 是 public。
3. **Demo Day 网络问题** -- 备份视频兜底。
4. **测试网不稳定** -- Dashboard 有 DEMO 模式兜底，不依赖链上数据也能展示。
