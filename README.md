# ChemScene Agent

化学 3D 教学建模智能体 — 输入化学概念，自动生成可交互的 Three.js 3D 教学网页并部署上线。

基于 **EdgeOne Makers** 平台构建，支持一键部署到全球 3200+ 边缘节点。

## 快速开始

### 本地开发

```bash
npm install
npm run dev:agents   # 启动 Makers 本地开发（含 Agent + 前端）
```

或仅开发前端：

```bash
npm run dev          # Vite 前端开发
```

### 环境变量

复制 `.env.example` 为 `.env`：

- **方式1（推荐）**：使用 Makers 内置 AI Gateway，部署后平台自动注入 `AI_GATEWAY_*` 变量
- **方式2**：使用自己的 DeepSeek API Key，设置 `DEEPSEEK_API_KEY`

### 部署到 EdgeOne Makers

```bash
edgeone makers deploy
```

或推送到已绑定的 Git 仓库自动部署。

## 架构

```
agents/chat/index.ts          → POST /chat (SSE 流式 Agent 对话)
cloud-functions/upload/       → POST /upload (文件上传)
cloud-functions/preview/      → GET /preview (预览)
cloud-functions/history/      → POST /history (历史记录)
shared/templates/             → 3D 模板库（分子/反应/晶体）
shared/types.ts               → 类型定义
public/                       → 静态前端资源
index.html                    → Web 控制台入口
```

## 功能

- 4 个 Agent 工具：parse_input → clarify → generate → deploy
- 3 个 3D 模板：分子结构、化学反应、晶体结构
- 11 个预置分子坐标库
- SSE 流式输出
- mcporter 免登录部署到 EdgeOne
- Makers 会话存储（对话历史持久化）

## 技术栈

| 层 | 技术 |
|----|------|
| 平台 | EdgeOne Makers |
| Agent | 原生 fetch + OpenAI Function Calling |
| LLM | DeepSeek / Makers AI Gateway |
| 3D | Three.js r128 |
| 前端 | 原生 HTML/CSS/JS + Vite |
