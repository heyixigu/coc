# Agent 指引（coc-simulator）

本目录是 **秘仪残卷 · CoC 模拟台** — 克苏鲁的呼唤（Call of Cthulhu）纯前端文字跑团客户端。

## 开始阅读

1. **先读** [`ARCHITECTURE.md`](./ARCHITECTURE.md) 顶部的 **「AI 速读」**（约 30 秒把握全局）。
2. **再按需** 阅读 `ARCHITECTURE.md` 各章节：序幕、Bootstrap、守密人协议、掷骰、UI、修改注意点。
3. **改 prompt / 角色 / 规则** 时优先看 `src/config/`（`system_prompt.js`、`characters.js`、`judge_prompt.js`）。

## 核心约束（勿违反）

- **随机数只在客户端生成**（`src/dice.js`）；模型只写剧情或输出 `[ROLL:…]` 请求检定。
- **玩家回合主流程**：裁判 → 预掷骰 → GM 叙述；不要改成「让模型自己报骰点」。
- **`partner`** 是林知渺的数值面板；她的对白写在 GM 回复的 `【林知渺】` 段，不是独立玩家账号。
- **GM 回复格式** 四段固定；改格式须同步 `system_prompt.js` 与 `parseGmStatus.js` 等解析逻辑。

## 关键入口文件

| 用途 | 文件 |
|------|------|
| 路由 / 序幕门控 | `src/App.jsx` |
| 主局 UI、发送、bootstrap | `src/GameApp.jsx` |
| DeepSeek HTTP/SSE | `src/deepseek.js` |
| GM 流式 + `[ROLL]` 链 | `src/gmRollLoop.js` |
| 玩家回合（裁判→骰→叙述） | `src/playerTurn.js` |
| 第一幕 | `src/startActOne.js` |

完整文件表见 [`ARCHITECTURE.md` §2](./ARCHITECTURE.md#2-目录与职责)。
