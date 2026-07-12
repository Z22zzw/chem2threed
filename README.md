# ChemScene Agent

化学 3D 教学建模智能体 — 输入化学概念，自动生成可交互的 Three.js 3D 教学网页并部署上线。

## 快速开始

### 本地开发

```bash
npm install
npm run dev
```

访问 http://localhost:3000

### 部署到 Railway

1. 在 https://railway.new 新建项目，选择"从 GitHub 仓库部署"
2. 选择仓库 `Z22zzw/Chemistry2ThreeD`
3. 配置环境变量：`DEEPSEEK_API_KEY=sk-xxxx`
4. 部署完成后获得 `xxx.up.railway.app` 永久公网链接，任何人都能访问

> Railway 会自动识别 `package.json` 的 `build` 和 `start` 脚本，无需额外配置。

### 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `DEEPSEEK_API_KEY` | 是 | DeepSeek API Key，获取：https://platform.deepseek.com |
| `EDGEONE_DEPLOY_METHOD` | 否 | 部署方式：`mcporter`（默认）/ `cli` / `auto` |
| `EDGEONE_TOKEN` | 否 | EdgeOne Pages Token，仅 CLI 部署方式需要 |
| `PORT` | 否 | 服务端口，Railway 自动注入 |

## 使用方法

1. 在输入框描述化学概念，例如：
   - "甲烷的分子结构，要能看出正四面体"
   - "乙烯的加成反应过程"
   - "氯化钠的晶体结构"
2. 智能体解析需求，必要时追问确认
3. 自动生成 3D 网页并部署，返回公网链接

## 功能

- 4 个 Agent 工具：parseInput → clarify → generate → deploy
- 3 个 3D 模板：分子结构、化学反应、晶体结构
- 11 个预置分子坐标库（甲烷/乙烷/乙烯/乙炔/苯/水/CO2/氨/乙醇/NaCl/葡萄糖）
- SSE 流式输出
- mcporter 免登录部署到 EdgeOne
- 文件上传（PDF/DOCX/TXT/图片）

## 技术栈

| 层 | 技术 |
|----|------|
| 语言 | TypeScript 5.x |
| Agent 框架 | Vercel AI SDK 4.x |
| LLM | DeepSeek (deepseek-chat) |
| 3D 引擎 | Three.js r128 |
| Web 框架 | Hono 4.x |
| 部署平台 | Railway |
