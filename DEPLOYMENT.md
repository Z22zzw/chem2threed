# EdgeOne Makers 部署指南

本文档说明如何将 ChemScene Agent 部署到腾讯 EdgeOne Makers 平台。

## 关于 EdgeOne Makers

[EdgeOne Makers](https://pages.edgeone.ai) 是腾讯云基于 EdgeOne 基础设施打造的前端开发和部署平台，专为现代 Web 应用和 AI Agent 设计。

**核心特性**：
- 全球 3200+ 边缘节点分发
- 自动 HTTPS
- Git 推送自动部署
- 预览/生产环境分离
- 自定义域名绑定
- 环境变量管理
- 支持 19+ 框架模板

## 两种部署方式

本项目支持两种部署到 EdgeOne 生态的方式：

### 方式一：EdgeOne Makers（部署整个智能体服务）

将整个 ChemScene Agent 服务部署到 Makers，得到一个公网可访问的 Web 应用。

**适用场景**：让任何人都能通过 URL 访问你的智能体控制台。

**部署步骤**：

1. **准备 Git 仓库**
   ```bash
   cd chemscene-agent
   git init
   git add .
   git commit -m "ChemScene Agent"
   ```
   推送到 GitHub/GitLab/Gitee。

2. **在 Makers 创建项目**
   - 访问 https://pages.edgeone.ai
   - 点击"创建项目" → "导入 Git 仓库"
   - 选择你的仓库

3. **配置构建设置**（makers.json 已预置）
   - 框架预设：Node.js
   - 构建命令：`npm install && npm run build`
   - 输出目录：`dist`
   - 启动命令：`npm start`
   - Node 版本：22.17.1

4. **配置环境变量**
   在项目设置 → 环境变量中添加：
   ```
   DEEPSEEK_API_KEY=sk-your-key-here
   EDGEONE_DEPLOY_METHOD=mcporter
   NODE_ENV=production
   ```
   > 注意：`EDGEONE_TOKEN` 可不配，使用 mcporter 免登录部署

5. **部署**
   - 推送代码到 `main` 分支 → 自动触发生产部署
   - 推送到其他分支 → 触发预览部署（3小时有效链接）

6. **访问**
   部署成功后，Makers 会分配一个 `xxx.edgeone.app` 域名，直接访问即可使用智能体。

### 方式二：mcporter 免登录部署（仅部署生成的 3D 页面）

智能体运行时，为用户生成的每个 3D 教学页面单独部署。这是智能体内部自动调用的，无需用户操作。

**机制**：
```bash
npx -y mcporter call mcp-on-edge.edgeone.app/mcp-server.deploy-html value="<html>...</html>"
```

**特点**：
- 无需登录、无需 Token
- 每次调用返回一个独立的公网 URL
- 适合临时分享和课堂演示

**配置**：
默认就是这种方式。如需切换，修改 `.env`：
```env
# auto（默认）：优先 mcporter，失败回退 CLI
EDGEONE_DEPLOY_METHOD=auto

# 仅用 mcporter
EDGEONE_DEPLOY_METHOD=mcporter

# 仅用 CLI（需要 EDGEONE_TOKEN）
EDGEONE_DEPLOY_METHOD=cli
```

### 方式三：EdgeOne Pages CLI（可选的高级方式）

如果需要项目管理、自定义域名等高级功能，可使用 CLI：

1. 安装 CLI
   ```bash
   npm install -g edgeone@latest
   ```

2. 登录（二选一）
   - 浏览器登录：`edgeone login --site china`
   - Token 登录：在 https://console.cloud.tencent.com/edgeone/pages?tab=settings 创建 Token

3. 配置 `.env`
   ```env
   EDGEONE_TOKEN=your-token-here
   EDGEONE_DEPLOY_METHOD=cli
   ```

## 部署架构图

```
┌─────────────────────────────────────────────────┐
│            EdgeOne Makers 平台                   │
│                                                   │
│  ┌─────────────────────────────────────────┐    │
│  │   ChemScene Agent (Node.js Hono 服务)   │    │
│  │                                           │    │
│  │   /api/chat    - SSE 流式对话            │    │
│  │   /api/upload  - 文件上传                │    │
│  │   /api/preview - 本地预览                │    │
│  │   /            - Web 控制台              │    │
│  └────────────────┬────────────────────────┘    │
│                   │                              │
│                   │ 调用 mcporter                 │
│                   ▼                              │
│  ┌─────────────────────────────────────────┐    │
│  │   mcp-on-edge.edgeone.app (公共 MCP)    │    │
│  │   为每个生成的 3D 页面分配独立 URL      │    │
│  └─────────────────────────────────────────┘    │
│                                                   │
│   全球 3200+ 边缘节点 CDN 加速                  │
└─────────────────────────────────────────────────┘
```

## 常见问题

**Q: Makers 部署后，生成的 3D 页面链接会失效吗？**
A: mcporter 返回的链接是临时性的。如需长期稳定，建议用 CLI 方式部署到自己的项目下，或绑定自定义域名。

**Q: Makers 免费额度够用吗？**
A: 个人项目通常完全够用。Makers 提供免费额度包含全球 CDN 加速、自动 HTTPS。

**Q: 可以同时用 Makers 和 mcporter 吗？**
A: 可以，而且推荐这样做。Makers 部署智能体服务本身，mcporter 用于智能体运行时为用户生成的每个 3D 页面快速部署。
