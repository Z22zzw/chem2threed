# ChemScene Agent

基于 EdgeOne Makers 和 OpenAI Agents SDK 的化学 3D 教学建模智能体。教师输入文字、图片或教案文件后，系统通过可选追问卡片确认展示细节，生成可交互的 Three.js 单页 3D 教学场景，并在右侧实时预览。

## 功能

- 文字、图片、PDF、TXT、DOCX 多模态输入。
- 选项式追问卡片：所有问题都有默认值，可直接生成。
- 6 类教学模板：分子结构、反应过程、晶体结构、电子轨道、化工设备、实验装置。
- Three.js 单文件 HTML 渲染，支持旋转、缩放、标签、动画和下载。
- EdgeOne Makers SSE 流式状态、工具指示灯和停止生成。
- 生成后返回 `/scene?...` 场景链接；本地无 Blob/Store 权限时右侧预览仍可用。

## 本地开发

```bash
npm install
edgeone makers dev --name chemscene-agent --skip-env-sync
```

如需指定端口：

```bash
edgeone makers dev --name chemscene-agent --skip-env-sync --port 8095
```

## 构建

```bash
npm run build
```

## 目录

```text
agents/
  chat/index.ts        # 主 SSE Agent 入口
  _chemScene.ts        # 化学解析、模板匹配、Scene Spec、Three.js HTML 渲染
  _tools.ts            # ChemScene Agent 工具注册
cloud-functions/
  upload/index.ts      # 附件上传和文本提取
  scene/index.ts       # 公开场景 HTML 路由
  scene-feedback/      # 重新生成反馈入口
src/
  components/
    ChatInput.tsx
    ClarifyCard.tsx
    ScenePreviewPanel.tsx
```

## 注意

场景生成会优先调用 OpenAI-compatible 模型生成结构化 Scene Spec，再由 Three.js 渲染器生成可交互 HTML。请在 `.env` 中配置 `AI_GATEWAY_API_KEY`、`AI_GATEWAY_BASE_URL`，可选配置 `AI_GATEWAY_MODEL`；也兼容 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`。当模型端点不可用时，系统会降级到本地化学模板，保证预览和下载流程仍可使用。`/scene` 持久链接依赖 EdgeOne Makers Store/Blob 权限，本地账号未开通相关能力时会使用本地兜底存储。
