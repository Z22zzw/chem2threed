# ChemScene Agent

化学 3D 教学建模智能体 — 输入化学概念，自动生成可交互的 Three.js 3D 教学网页并部署上线。

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入：
- `DEEPSEEK_API_KEY` — DeepSeek API Key（必填，获取：https://platform.deepseek.com）
- `EDGEONE_DEPLOY_METHOD` — 部署方式，默认 `auto`（mcporter 免登录优先）
- `EDGEONE_TOKEN` — EdgeOne Pages Token（选填，仅 CLI 方式需要，mcporter 免登录无需配置）

> **默认开箱即用**：只需配 `DEEPSEEK_API_KEY`，部署使用 mcporter 免登录方式，无需任何 EdgeOne 配置。

### 2. 安装依赖

```bash
npm install
```

> 如果 npm 全局缓存目录不可写，使用：`npm install --cache ./.npm-cache`

### 3. 启动服务

```bash
npm run dev
```

访问 http://localhost:3000 即可使用。

### 部署到 EdgeOne Makers（可选）

将整个智能体服务部署到公网，详见 [DEPLOYMENT.md](./DEPLOYMENT.md)：

```bash
npm run build
# 推送到 Git 仓库，在 https://pages.edgeone.ai 导入即可
```

### 使用方法

1. 在输入框描述你想建模的化学概念，例如：
   - "甲烷的分子结构，要能看出正四面体"
   - "乙烯的加成反应过程"
   - "氯化钠的晶体结构"
2. （可选）上传教案、图片等文件辅助说明
3. 智能体会解析需求，必要时追问确认
4. 自动生成 3D 网页并部署到 EdgeOne，返回访问链接

## 功能特性

- 多模态输入：文字 + 图片 + 文件（PDF/DOCX/TXT）
- 智能追问：信息不足时自动确认细节，可跳过
- 3D 模板库：
  - `molecule-3d` 分子结构（预置 11 种常见分子坐标）
  - `reaction-3d` 化学反应过程（多步骤动画）
  - `crystal-3d` 晶体结构（NaCl/金刚石/简单立方/BCC/FCC）
- 一键部署：EdgeOne Pages CLI 自动部署，返回公网链接
- 实时预览：侧边栏即时预览生成的 3D 页面
- 历史记录：本地保存生成历史

## 预置分子坐标库

甲烷、乙烷、乙烯、乙炔、苯、水、二氧化碳、氨气、乙醇、氯化钠、葡萄糖

输入这些分子名称时，无需提供坐标，模板自动查找。

## 技术栈

| 层 | 技术 |
|----|------|
| 语言 | TypeScript 5.x |
| Agent 框架 | Vercel AI SDK 4.x (`streamText` + `tools`) |
| LLM | DeepSeek (deepseek-chat) |
| 3D 引擎 | Three.js r128 |
| Web 框架 | Hono 4.x |
| 部署 | 腾讯 EdgeOne Pages CLI |
| 运行时 | Node.js 22.x |

## 项目结构

```
chemscene-agent/
├── src/
│   ├── index.ts              # 服务入口
│   ├── agent/
│   │   ├── index.ts          # Agent 主循环
│   │   ├── tools.ts          # 4个工具定义
│   │   └── prompts.ts        # 系统提示词
│   ├── templates/
│   │   ├── registry.ts       # 模板注册表+匹配器
│   │   ├── molecule.ts       # 分子结构模板
│   │   ├── reaction.ts       # 化学反应模板
│   │   ├── crystal.ts        # 晶体结构模板
│   │   └── _shared/
│   │       ├── coordinates.ts # 预置原子坐标库
│   │       └── boilerplate.ts # Three.js 公共代码
│   ├── api/
│   │   ├── chat.ts           # SSE 流式对话
│   │   ├── upload.ts         # 文件上传
│   │   ├── preview.ts        # 预览
│   │   └── history.ts        # 历史记录
│   ├── services/
│   │   ├── deepseek.ts       # DeepSeek 封装
│   │   ├── edgeone.ts        # EdgeOne 部署
│   │   ├── file-parser.ts    # 文件解析
│   │   └── storage.ts        # 存储
│   ├── web/                  # Web 控制台前端
│   └── types/                # 类型定义
├── package.json
├── tsconfig.json
└── .env.example
```

## API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/chat` | POST | SSE 流式对话，核心接口 |
| `/api/upload` | POST | 文件上传（multipart） |
| `/api/preview/:id` | GET | 预览生成的 3D 页面 |
| `/api/history` | GET | 获取历史记录 |
| `/api/health` | GET | 健康检查 |

## 构建

```bash
npm run build    # 构建
npm start        # 生产运行
npm run typecheck # 类型检查
```

## 注意事项

- DeepSeek 不支持图片识别，图片上传目前仅作为附件记录，不影响文本解析
- EdgeOne 部署需要先运行 `edgeone login` 登录，或在 `.env` 配置 `EDGEONE_TOKEN`
- 生成的 3D 页面通过 CDN 加载 Three.js，需联网访问
