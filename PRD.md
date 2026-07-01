# PRD - ChemScene Agent（chem2threed 模板适配版）

| 项目 | 内容 |
|------|------|
| 项目代号 | ChemScene Agent |
| 模板仓库 | `chem2threed` |
| 版本 | v1.0 |
| 日期 | 2026-07-01 |
| 状态 | Spec 已确认，待开发 |
| 目标形态 | 基于 EdgeOne Makers + OpenAI Agents SDK 的化学 3D 教学建模智能体 |

---

## 1. 产品概述

### 1.1 一句话定义

化学教师通过文字、图片或教学文件描述教学需求，智能体以选项式追问卡片补齐可选细节，并自动生成可交互的 Three.js 3D 教学网页，完成本地预览和 EdgeOne 部署，返回课堂可直接打开的公网链接。

### 1.2 核心价值

- 降低技术门槛：教师无需掌握 Three.js、WebGL 或前端工程，只需要描述教学目标。
- 快速生成教具：从“甲烷正四面体结构”“氯化钠晶体”“实验室制氧装置”等需求，直接得到 3D 教学页面。
- 课堂即用：生成后自动部署到 EdgeOne，输出公网 URL；部署失败时仍提供可预览和可下载的 HTML。
- 交互可讲解：模型支持旋转、缩放、标注、动画、键/轨道切换等教学交互。
- 可精调也可跳过：所有追问项均有默认值，用户可逐项选择，也可直接生成。

### 1.3 目标用户

| 角色 | 场景 |
|------|------|
| 中学/高校化学教师 | 备课时快速生成 3D 教具，替代手绘图或零散网络资源 |
| 师范生/参赛者 | 使用 AI 辅助完成教学设计和课堂演示素材制作 |
| 教研人员 | 快速制作概念演示、反应过程和实验装置说明页面 |

### 1.4 非目标

- 不做通用 3D 建模工具，只聚焦化学教学场景。
- 不做学生端学习管理系统，不包含作业、考试、班级和成绩管理。
- 不做复杂课件编辑器，输出目标是单个可访问的互动网页。
- 不做多人实时协作。
- 不承诺生成可用于科研计算的精确分子模拟结果；教学可视化优先。

---

## 2. 当前模板适配结论

当前 `chem2threed` 模板不是原 PRD 设想的 `Vercel AI SDK + Hono` 架构，而是：

| 层 | 当前模板能力 | 适配策略 |
|----|--------------|----------|
| Agent 框架 | `@openai/agents` | 保留，替换示例 Agent 指令和工具 |
| 后端路由 | `agents/chat/index.ts` 映射 `POST /chat` | 作为主对话和 SSE 流式入口 |
| 工具定义 | `agents/_tools.ts` | 替换天气/翻译示例工具为化学 3D 生成工具 |
| SSE | `agents/_sse.ts` 已封装 | 扩展业务事件，如追问卡片、预览、部署状态 |
| 会话记忆 | `context.store.openaiSession(conversationId)` | 保留，用于多轮对话和历史恢复 |
| 历史/会话 | `cloud-functions/history`、`conversations` 等 | 保留，扩展生成结果元数据 |
| 前端 | React + Vite 聊天界面 | 改造为化学 3D 生成控制台 |
| 右侧面板 | 示例代码/Debug | 改为实时预览、生成状态和部署结果；Debug 作为开发模式 |
| 部署 | EdgeOne Makers 模板 | 生成页继续通过 EdgeOne 部署 |

新版 PRD 不再要求新增 Hono 服务，也不使用 Vercel AI SDK。所有功能基于当前模板演进。

---

## 3. 已确认 Spec

| 编号 | 决策项 | 确认结果 |
|------|--------|----------|
| S1 | 多模态输入 | P0，支持文字、图片、PDF/TXT/DOCX |
| S2 | 部署策略 | 自动部署到 EdgeOne；失败时返回预览和 HTML 下载 |
| S3 | 模型策略 | 支持指定多个模型，按任务路由 |
| S4 | 追问形态 | 选项式卡片，所有项可选，均有默认值，可直接生成 |
| S5 | 模板范围 | v1 一次性完成 6 类化学场景模板 |
| S6 | 右侧面板 | 实时预览 + 生成状态 + 部署链接；Debug 保留为开发模式 |

---

## 4. 用户故事与核心流程

### 4.1 典型用户故事

作为一名高中化学老师，我想让学生理解“甲烷的正四面体结构”和 “sp3 杂化”。我输入“甲烷分子结构，要能看出正四面体和 sp3 杂化”，系统给出默认追问卡片：是否显示键角、是否显示原子标签、是否开启动画。我可以直接使用默认值，也可以选择“显示 109.5° 键角”和“开启轨道示意”。随后系统生成一个可旋转、可缩放、带标注的 Three.js 网页，预览无误后自动部署并返回 URL。

### 4.2 端到端流程

```text
用户输入文字/图片/文件
        |
        v
前端收集消息与附件
        |
        v
POST /chat 进入 EdgeOne Makers Agent
        |
        v
Agent 调用工具解析需求与附件
        |
        v
生成可选追问卡片
        |
        +-- 用户精调选项
        |
        +-- 用户直接生成，采用默认值
        |
        v
匹配 6 类化学 3D 模板之一
        |
        v
生成结构化 Scene Spec
        |
        v
渲染单文件 Three.js HTML
        |
        v
右侧面板实时预览
        |
        v
EdgeOne 自动部署
        |
        v
返回公网 URL、预览结果和历史记录
```

### 4.3 流程变体

| 场景 | 处理 |
|------|------|
| 输入足够详细 | 可不展示追问卡片，直接生成 |
| 输入信息不完整 | 展示追问卡片，但所有选项都有默认值 |
| 用户点击“直接生成” | 跳过追问，使用默认参数 |
| 用户上传图片 | 使用视觉模型或多模态模型解析图片内容 |
| 用户上传 PDF/DOCX/TXT | 先提取文本，再进入需求解析 |
| 生成 HTML 失败 | 重试 1 次；仍失败则返回错误原因和建议 |
| 部署失败 | 保留右侧预览，提供 HTML 下载和错误信息 |
| 用户不满意 | 支持基于当前会话重新生成或调整选项后再生成 |

---

## 5. 功能需求

### 5.1 功能清单

| 编号 | 功能 | 优先级 | 说明 |
|------|------|--------|------|
| F1 | 多模态输入接收 | P0 | 支持文字、JPG/PNG 图片、PDF/TXT/DOCX 文件 |
| F2 | 输入解析 | P0 | 提取建模对象、知识点、教学目标、场景类型 |
| F3 | 选项式追问卡片 | P0 | 每轮 1-3 个问题，均有默认值，用户可跳过 |
| F4 | 模板匹配 | P0 | 在 6 类化学 3D 场景模板中选择最合适模板 |
| F5 | Scene Spec 生成 | P0 | 将用户意图转成结构化 3D 场景参数 |
| F6 | HTML 生成 | P0 | 基于模板生成单文件 Three.js HTML |
| F7 | 实时预览 | P0 | 右侧面板显示生成状态、iframe 预览和错误信息 |
| F8 | EdgeOne 自动部署 | P0 | 自动部署并返回公网 URL |
| F9 | 重新生成 | P0 | 用户可基于现有参数调整后重新生成 |
| F10 | 历史记录 | P0 | 保留对话、输入、模板、预览状态和部署 URL |
| F11 | 停止生成 | P1 | 沿用模板的停止生成能力 |
| F12 | 调试面板 | P1 | 开发模式展示 SSE 事件和工具调用 |

### 5.2 多模态输入规范

#### 文字输入

```json
{
  "type": "text",
  "content": "我想展示乙醇分子的结构，要能看出羟基和碳链"
}
```

#### 图片输入

```json
{
  "type": "image",
  "mimeType": "image/png",
  "fileName": "molecule.png",
  "caption": "参考这张分子结构图",
  "storageKey": "uploads/{conversationId}/{fileId}.png"
}
```

#### 文件输入

```json
{
  "type": "file",
  "mimeType": "application/pdf",
  "fileName": "教案.pdf",
  "storageKey": "uploads/{conversationId}/{fileId}.pdf",
  "extractedText": "..."
}
```

### 5.3 上传约束

| 项 | 要求 |
|----|------|
| 图片格式 | JPG、PNG |
| 文件格式 | PDF、TXT、DOCX |
| 单文件大小 | 默认不超过 20 MB |
| 单次上传数量 | 默认最多 5 个 |
| 文件处理失败 | 不阻断文字需求，提示用户该附件未被解析 |
| 安全策略 | 不直接执行上传文件内容；HTML 预览使用 sandbox iframe |

---

## 6. 追问卡片规范

### 6.1 设计原则

- 所有追问项都是可选项。
- 每个问题必须提供默认值。
- 用户可以逐项精调，也可以点击“直接生成”。
- 追问最多 3 轮，每轮 1-3 个问题。
- 问题类型限定在教学表达需要，不追问无关实现细节。

### 6.2 问题类型

| 类型 | 示例 |
|------|------|
| 单选 | 结构展示模式：球棍模型 / 空间填充 / 混合 |
| 多选 | 交互能力：旋转、缩放、标签、动画、键角标注 |
| 开关 | 是否显示电子云、是否显示反应箭头 |
| 文本 | 页面标题、讲解说明 |
| 数值 | 动画速度、晶胞重复数量 |

### 6.3 事件格式

```json
{
  "event": "clarify_card",
  "data": {
    "title": "确认教学展示细节",
    "reason": "系统已识别为分子结构教学场景，可选择是否显示键角和杂化轨道。",
    "questions": [
      {
        "id": "display_mode",
        "label": "结构展示模式",
        "type": "single_select",
        "required": false,
        "defaultValue": "ball_stick",
        "options": [
          { "label": "球棍模型", "value": "ball_stick" },
          { "label": "空间填充", "value": "space_filling" },
          { "label": "混合显示", "value": "mixed" }
        ]
      },
      {
        "id": "annotations",
        "label": "需要哪些标注？",
        "type": "multi_select",
        "required": false,
        "defaultValue": ["atom_label", "bond_angle"],
        "options": [
          { "label": "原子标签", "value": "atom_label" },
          { "label": "键角", "value": "bond_angle" },
          { "label": "键长", "value": "bond_length" }
        ]
      }
    ],
    "actions": {
      "primary": "使用以上选项生成",
      "secondary": "直接生成"
    }
  }
}
```

---

## 7. 化学 3D 模板范围

v1 一次性完成全部 6 类模板。

| 模板 ID | 场景 | 示例输入 | v1 要求 |
|---------|------|----------|---------|
| `molecule-3d` | 单分子结构 | “甲烷分子结构” | 原子、键、标签、键角、球棍/空间填充 |
| `reaction-3d` | 化学反应过程 | “氢气燃烧反应” | 反应物/生成物、箭头、动画时间轴 |
| `crystal-3d` | 晶体结构 | “氯化钠晶体结构” | 晶胞、重复阵列、离子颜色和晶格标注 |
| `orbital-3d` | 电子轨道 | “sp3 杂化轨道” | 轨道瓣、方向、透明度、杂化说明 |
| `equipment-3d` | 化工设备 | “精馏塔结构” | 设备主体、关键部件、流程箭头 |
| `apparatus-3d` | 实验装置 | “实验室制取氧气装置” | 烧瓶、导管、集气瓶、加热/气流动画 |

### 7.1 生成结果通用要求

| 要素 | 要求 |
|------|------|
| Three.js | 固定版本 CDN 引入 |
| 控制器 | OrbitControls 必须支持旋转和缩放 |
| 场景 | Scene、Camera、Renderer、灯光、Resize 处理 |
| UI | 标题、简短说明、控制按钮、加载状态 |
| 响应式 | 桌面和移动端可用 |
| 交互 | 根据模板支持标注、动画、显隐切换 |
| 降级 | 如果某个高级元素无法生成，保留核心 3D 主体 |

### 7.2 常见分子坐标库

v1 内置常见教学分子坐标或结构参数，至少覆盖：

甲烷、乙烷、乙烯、乙炔、苯、乙醇、乙酸、水、二氧化碳、氨气、氯化钠、硫酸、硝酸、葡萄糖、丙烷、丁烷、甲醛、丙酮、尿素、甲胺、环己烷、萘、吡啶、呋喃、噻吩、苯酚、苯胺、甲苯、二甲苯。

坐标来源优先级：

1. 内置坐标库。
2. RDKit.js 或等价结构生成能力。
3. LLM 基于教学可视化目标估算。

---

## 8. Agent 工具设计

工具在 `agents/_tools.ts` 中注册，替换当前示例工具。工具名称必须稳定，避免模型臆造工具名。

| 工具名 | 作用 | 输入 | 输出 |
|--------|------|------|------|
| `parse_chem_request` | 解析用户需求 | 用户文本、附件摘要、会话上下文 | 建模对象、知识点、教学目标、缺失信息 |
| `analyze_attachment` | 解析图片/文件 | 附件元数据、文件内容或可访问地址 | 图片描述、文档摘要、可用化学线索 |
| `create_clarify_card` | 生成追问卡片 | 解析结果、缺失信息 | 选项式卡片 JSON |
| `match_scene_template` | 匹配模板 | 解析结果、用户选项 | 模板 ID 和匹配原因 |
| `generate_scene_spec` | 生成结构化场景 | 模板 ID、教学目标、用户选项 | Scene Spec JSON |
| `render_threejs_html` | 渲染 HTML | Scene Spec | 单文件 HTML、sceneId、预览元数据 |
| `deploy_scene_to_edgeone` | 部署页面 | HTML 内容或临时目录 | 部署 URL、部署状态 |

### 8.1 Scene Spec 样例

```json
{
  "sceneId": "scene_20260701_xxx",
  "templateId": "molecule-3d",
  "title": "甲烷分子的正四面体结构",
  "teachingGoal": "帮助学生理解 sp3 杂化与 109.5° 键角",
  "language": "zh",
  "visualStyle": {
    "colorScheme": "cpk",
    "background": "light",
    "displayMode": "ball_stick"
  },
  "interactions": ["rotate", "zoom", "atom_label", "bond_angle", "toggle_orbital"],
  "chemistry": {
    "atoms": [
      { "element": "C", "position": [0, 0, 0], "label": "C" },
      { "element": "H", "position": [1, 1, 1], "label": "H" }
    ],
    "bonds": [
      { "from": 0, "to": 1, "type": "single" }
    ],
    "annotations": [
      { "type": "angle", "label": "109.5°" }
    ]
  }
}
```

---

## 9. 多模型路由

系统支持多个模型，按任务选择。所有模型均通过 OpenAI 兼容接口接入，优先沿用模板已有的 AI Gateway 配置。

| 任务 | 推荐模型类型 | 用途 |
|------|--------------|------|
| 对话与需求解析 | 通用对话模型 | 理解教师意图、组织追问 |
| 图片解析 | Vision 模型 | 识别结构图、实验装置图、教材截图 |
| 文档摘要 | 长上下文/通用模型 | 从教案、PDF、DOCX 中提取教学需求 |
| Scene Spec 生成 | 结构化输出强的模型 | 输出符合 schema 的 JSON |
| HTML/JS 生成 | 代码模型 | 生成或修正 Three.js 页面 |

### 9.1 环境变量

```env
AI_GATEWAY_API_KEY=your-api-key
AI_GATEWAY_BASE_URL=https://your-openai-compatible-endpoint/v1
AI_GATEWAY_MODEL=@makers/deepseek-v4-flash

# 可选：按任务覆盖
AI_GATEWAY_TEXT_MODEL=@makers/deepseek-v4-flash
AI_GATEWAY_CODE_MODEL=deepseek-coder
AI_GATEWAY_VISION_MODEL=qwen-vl
AI_GATEWAY_LONG_CONTEXT_MODEL=deepseek-chat

# 部署
EDGEONE_TOKEN=your-edgeone-token
EDGEONE_PROJECT_NAME=chemscene-agent
```

如果某个任务模型未配置，则回退到 `AI_GATEWAY_MODEL`。

---

## 10. API 与 SSE 设计

### 10.1 保留现有路由

| 路由 | 当前作用 | 适配后作用 |
|------|----------|------------|
| `POST /chat` | 主聊天 SSE | 主 Agent 对话、工具调用、生成和部署 |
| `POST /stop` | 停止 Agent | 保留 |
| `POST /history` | 拉取历史 | 保留，扩展生成结果元数据 |
| `POST /conversations` | 会话列表 | 保留 |
| `POST /clear-history` | 清空历史 | 保留 |
| `POST /delete-conversation` | 删除会话 | 保留 |

### 10.2 新增路由

| 路由 | 类型 | 说明 |
|------|------|------|
| `POST /upload` | cloud-function | 接收图片和文件，返回附件 metadata |
| `POST /scene-feedback` | cloud-function | 用户对生成结果的重新生成/调整反馈 |

说明：预览优先通过前端右侧面板 `iframe srcDoc` 或 Blob URL 展示生成 HTML，不强依赖新增 `GET /preview/:id` 路由。

### 10.3 `/chat` 请求体

```json
{
  "message": "我想展示甲烷的正四面体结构",
  "userId": "browser-user-id",
  "userMsgId": "msg-id",
  "botMsgId": "msg-id",
  "attachments": [
    {
      "type": "image",
      "fileName": "methane.png",
      "mimeType": "image/png",
      "storageKey": "uploads/xxx.png"
    }
  ],
  "clarifySelections": {
    "display_mode": "ball_stick",
    "annotations": ["atom_label", "bond_angle"]
  },
  "generationMode": "auto"
}
```

### 10.4 SSE 事件

| 事件 | 说明 |
|------|------|
| `text_delta` | Agent 文本流，保留模板现有事件 |
| `tool_called` | 工具调用指示灯，保留并换成业务工具名 |
| `clarify_card` | 选项式追问卡片 |
| `generation_status` | 解析、匹配、生成、校验、部署进度 |
| `scene_spec` | 结构化场景参数，开发模式可见 |
| `preview_ready` | HTML 已生成，右侧面板可预览 |
| `deploying` | 开始部署 |
| `deploy_done` | 部署成功，返回公网 URL |
| `scene_error` | 业务错误，含建议和可重试信息 |
| `done` | 流结束 |
| `error` | 系统错误 |

### 10.5 `preview_ready` 事件样例

```json
{
  "event": "preview_ready",
  "data": {
    "sceneId": "scene_20260701_xxx",
    "templateId": "molecule-3d",
    "htmlContent": "<!DOCTYPE html>...",
    "title": "甲烷分子的正四面体结构"
  }
}
```

---

## 11. 前端改造

### 11.1 总体布局

| 区域 | 改造后用途 |
|------|------------|
| 左侧会话栏 | 保留会话列表、新建、删除、加载更多 |
| 中间聊天区 | 教师输入、Agent 回复、追问卡片、生成控制 |
| 输入栏 | 文本输入 + 图片/文件上传 + 发送/停止 |
| 顶部工具灯 | 显示解析、附件分析、模板匹配、生成、部署状态 |
| 右侧面板 | 实时预览、生成进度、部署 URL、下载 HTML |
| Debug 面板 | 开发模式查看 SSE 原始事件 |

### 11.2 右侧面板状态

| 状态 | 展示内容 |
|------|----------|
| 空状态 | 示例需求和支持模板 |
| 解析中 | 进度条、当前工具、已识别信息 |
| 待确认 | 追问卡片摘要和默认选项 |
| 生成中 | 模板、Scene Spec 摘要、生成进度 |
| 可预览 | iframe 预览、刷新预览、下载 HTML |
| 部署中 | 部署进度和日志 |
| 完成 | 公网 URL、复制链接、重新生成 |
| 失败 | 错误原因、可恢复操作 |

### 11.3 工具指示灯

替换当前示例工具：

| 工具灯 ID | 中文标签 |
|-----------|----------|
| `parse_chem_request` | 需求解析 |
| `analyze_attachment` | 附件解析 |
| `create_clarify_card` | 智能追问 |
| `match_scene_template` | 模板匹配 |
| `generate_scene_spec` | 场景规划 |
| `render_threejs_html` | 页面生成 |
| `deploy_scene_to_edgeone` | 自动部署 |

---

## 12. 数据与历史

### 12.1 会话历史

继续使用 EdgeOne Makers `context.store` 和现有 `/history`、`/conversations` 能力。

### 12.2 生成结果元数据

每次生成写入一条结构化元数据，便于历史恢复和重新生成：

```json
{
  "sceneId": "scene_20260701_xxx",
  "conversationId": "conv_xxx",
  "createdAt": "2026-07-01T00:00:00.000Z",
  "inputSummary": "甲烷正四面体结构",
  "templateId": "molecule-3d",
  "sceneSpec": {},
  "previewAvailable": true,
  "deployUrl": "https://xxx.edgeone.app",
  "status": "deployed"
}
```

默认历史保存元数据和部署 URL，不长期保存完整 HTML；如需重新生成，使用 `sceneSpec` 重新渲染。

---

## 13. 错误处理

| 错误场景 | 处理 |
|----------|------|
| 模型 API 超时 | 自动重试 1 次，仍失败则提示服务繁忙 |
| Vision 模型不可用 | 图片跳过解析，使用文字需求继续 |
| 文件解析失败 | 提示不支持或解析失败，不阻断生成 |
| Scene Spec 不符合 schema | 回传错误给模型修正，最多 2 次 |
| 模板匹配不明确 | 使用默认推荐模板，并在追问卡片中允许用户改选 |
| HTML 生成失败 | 重试 1 次；仍失败返回错误和建议 |
| 预览报错 | 显示错误日志，允许重新生成 |
| EdgeOne 部署失败 | 返回预览、HTML 下载和部署错误 |
| 用户中止 | 立即停止前端流，后端调用 `/stop` 中止运行 |

---

## 14. 安全与质量约束

- 生成 HTML 预览必须使用 sandbox iframe，避免影响主应用。
- 上传文件只用于解析，不直接执行文件内容。
- HTML 生成时固定允许的外部 CDN 白名单，如 Three.js、OrbitControls、RDKit.js。
- 工具参数必须使用 Zod schema 校验。
- Agent 指令必须约束工具调用顺序和工具名，避免臆造工具。
- 生成结果必须包含基础可用的 3D 主体，即使高级标注失败也不能空白。
- 所有生成页必须支持移动端基础浏览。
- 对化学知识不确定的内容要在页面说明中以“教学示意”表述，避免伪精确。

---

## 15. 验收标准

### 15.1 端到端验收

| 场景 | 输入 | 期望结果 |
|------|------|----------|
| 单分子 | “甲烷正四面体结构” | 生成可旋转分子模型，显示 C/H、键角或默认标注 |
| 化学反应 | “氢气燃烧生成水” | 展示反应物、生成物和动画过程 |
| 晶体 | “氯化钠晶体结构” | 展示晶胞和离子排列 |
| 轨道 | “sp3 杂化轨道” | 展示四个方向轨道瓣和说明 |
| 设备 | “精馏塔结构” | 展示塔体、进料、回流和产物流向 |
| 实验装置 | “实验室制取氧气装置” | 展示发生装置、导管、集气瓶和气流动画 |
| 图片输入 | 上传分子结构图 | 识别或摘要图片，并用于生成 |
| 文件输入 | 上传教案 PDF | 提取教学目标并生成对应场景 |
| 直接生成 | 用户不选择追问项 | 使用默认值完成生成和部署 |
| 部署失败 | 模拟 EdgeOne 错误 | 仍可预览并下载 HTML |

### 15.2 技术验收

- `npm run build` 通过。
- `/chat` 能推送 `text_delta`、`tool_called`、`preview_ready`、`deploy_done` 等事件。
- 会话刷新后历史能恢复。
- 右侧预览不出现空白画布。
- 生成页面在桌面和移动端均可旋转缩放。
- 6 类模板均有至少 1 个稳定示例。
- 重新生成不会破坏原会话历史。

---

## 16. 项目结构调整建议

基于当前模板，建议增加和改造以下文件：

```text
chem2threed/
├── agents/
│   ├── chat/index.ts                 # 主 Agent SSE，扩展业务事件映射
│   ├── _tools.ts                     # 替换为化学 3D 工具
│   ├── _prompts.ts                   # Agent 指令与工具调用规则
│   ├── _sceneTypes.ts                # Scene Spec 类型
│   ├── _templates.ts                 # 模板注册表
│   ├── _templateMatcher.ts           # 模板匹配逻辑
│   ├── _htmlRenderer.ts              # Three.js HTML 渲染
│   ├── _coordinates.ts               # 常见分子坐标库
│   └── _deploy.ts                    # EdgeOne 部署封装
├── cloud-functions/
│   ├── upload/index.ts               # 新增：图片/文件上传
│   ├── scene-feedback/index.ts       # 新增：重新生成/反馈
│   └── history/index.ts              # 保留并扩展元数据
├── src/
│   ├── components/
│   │   ├── AttachmentPicker.tsx       # 新增：附件上传
│   │   ├── ClarifyCard.tsx           # 新增：追问卡片
│   │   ├── ScenePreviewPanel.tsx     # 新增：右侧预览
│   │   └── ToolIndicators.tsx        # 改造工具灯
│   ├── api.ts                        # 扩展上传和新 SSE 事件
│   ├── types.ts                      # 扩展附件、卡片、Scene 元数据类型
│   └── i18n/                         # 更新中英文文案
└── PRD.md
```

---

## 17. 交付计划

用户可见 v1 必须一次性交付完整能力；内部开发可拆分，但不做“只交付两个模板”的阶段版。

| 内部阶段 | 内容 | 验收 |
|----------|------|------|
| D1 | 替换 Agent 指令和工具骨架 | 能解析化学需求并返回结构化结果 |
| D2 | 多模态上传和解析 | 图片/文件可进入 Agent 上下文 |
| D3 | 追问卡片和前端交互 | 用户可选默认值或直接生成 |
| D4 | 6 类模板与 Scene Spec | 每类模板至少 1 个稳定示例 |
| D5 | HTML 渲染与右侧预览 | iframe 可预览且非空白 |
| D6 | EdgeOne 自动部署 | 成功返回公网 URL，失败有降级 |
| D7 | 历史、重新生成、错误处理 | 可恢复会话并重新生成 |
| D8 | 测试、文档、体验优化 | 满足验收标准 |

---

## 18. 待开发前确认项

以下不阻塞 PRD，但会影响实现细节：

1. EdgeOne Pages CLI 在 Makers Agent 沙箱中的非交互式部署命令和认证方式。
2. 上传文件在 EdgeOne Makers 中的推荐持久化位置和大小限制。
3. Vision 模型的实际模型 ID、价格和上下文输入格式。
4. RDKit.js 采用浏览器端生成还是服务端生成。
5. 生成 HTML 是否需要长期保存完整源码，还是仅保存 Scene Spec 并按需重渲染。

---

## 19. 最终确认

本 PRD 已按以下原则改写：

- 功能保持原 PRD 一致，并补齐用户确认的新增约束。
- 技术架构完全适配当前 `chem2threed` 模板。
- 保留 EdgeOne Makers、OpenAI Agents SDK、SSE、会话存储和 React/Vite 前端。
- v1 范围覆盖多模态输入、选项式追问、6 类模板、实时预览、自动部署、历史记录和重新生成。
