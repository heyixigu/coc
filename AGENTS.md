# Agent 指引（coc-simulator）

本目录是 **秘仪残卷 · CoC 模拟台** — 克苏鲁的呼唤（Call of Cthulhu）纯前端文字跑团客户端。

## 开始阅读

1. **先读** [`AI_ONBOARDING.md`](./AI_ONBOARDING.md)（完整认知图：框架、三类 AI、GM 协议、玩家回合 chain、红线）。
2. **再按需** 阅读 [`ARCHITECTURE.md`](./ARCHITECTURE.md) 各章节：序幕、Bootstrap、掷骰备用路径、UI、沙盒扩展、修改注意点。
3. **改 prompt / 角色 / 规则** 时优先看 `src/config/`（主线）或 `src/sandbox/config/`（沙盒）。

## 核心约束（勿违反）

- **随机数只在客户端生成**（`src/dice.js` / `src/sandbox/sandboxDice.js`）；模型只写剧情或输出 `[ROLL:…]` 请求检定。
- **玩家回合主流程**：裁判 → 预掷骰 → GM 叙述；不要改成「让模型自己报骰点」。
- **主线**：`partner` 是林知渺的数值面板；她的对白写在 GM 回复的 `【林知渺】` 段，不是独立玩家账号。
- **主线 GM 格式** 四段固定；改格式须同步 `system_prompt.js` 与 `parseGmStatus.js` 等解析逻辑。
- **沙盒 GM 格式** 六段固定（含 `【状态变更】` JSON）；聊天与存档只存前五段展示文本；改格式须同步 `sandbox_system_prompt.js`、`sandboxValidateGmReply.js`、`sandboxStateChangeParser.js`。
- **沙盒勿改 CoC 主线**；沙盒勿在叙事/UI 硬编码克苏鲁/SAN 等主线机制。

## 关键入口文件

| 用途 | 主线 | 沙盒 |
|------|------|------|
| 路由 / 序幕门控 | `src/App.jsx` | 同左 |
| 主局 UI、发送 | `src/GameApp.jsx` | `src/sandbox/SandboxGameApp.jsx` |
| DeepSeek HTTP/SSE | `src/deepseek.js` | 同左 |
| GM 非流式 + 校验 | `src/gmTurn.js` | 同左（`fetchValidatedSandboxGmReply`） |
| 玩家回合 | `src/playerTurn.js` | `src/sandbox/sandboxPlayerTurn.js` |
| GM 状态解析 | `parseGmStatus.js` 等 | `sandboxStateChangeParser.js` + `sandboxParseGmStatus.js` |
| 存档迁移 | — | `src/sandbox/sandboxMigration.js` |
| 后台提取（事实/时间线/记忆） | — | `src/sandbox/sandboxFactExtractor.js` |

完整文件表见 [`ARCHITECTURE.md` §13](./ARCHITECTURE.md#13-目录与职责扩展索引)。
