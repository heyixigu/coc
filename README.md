# 秘仪残卷 · CoC 模拟台

纯前端的 **克苏鲁的呼唤 (Call of Cthulhu)** 文字跑团客户端：玩家扮演何以惜顾，由 DeepSeek 担任守密人并演绎同伴林知渺。浏览器本地掷骰，模型只写剧情。

## 文档

- **[架构说明（供 AI / 开发者）](./ARCHITECTURE.md)** — 含顶部「AI 速读」、守密人输出协议、掷骰两条路径、目录职责
- **[Agent 指引](./AGENTS.md)** — 给 Cursor / 其他 AI 助手的阅读顺序与约束摘要

## 运行

```bash
npm install
npm run dev
```

在界面中填写 [DeepSeek](https://platform.deepseek.com/) API Key（仅存于本机 `localStorage`）。

## 技术栈

- React 19 + Vite 8
- DeepSeek Chat Completions API（`deepseek-v4-flash`）
- 无后端
