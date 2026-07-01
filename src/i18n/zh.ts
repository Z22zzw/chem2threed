const zh = {
  // Header
  "app.title": "ChemScene Agent",
  "app.subtitle": "用对话生成可预览、可发布的化学 3D 教学网页",

  // Empty state
  "empty.title": "从一个教学目标开始",
  "empty.hint": "描述你要讲解的分子、反应、晶体、轨道、化工设备或实验装置。也可以上传结构图、教案 PDF、TXT 或 DOCX。",
  "empty.features": "Three.js 预览 · 选项式追问 · EdgeOne 公开链接",

  // Chat input
  "chat.placeholder": "例如：甲烷分子结构，要能看出正四面体和 sp3 杂化",
  "chat.hint": "支持 JPG/PNG/PDF/TXT/DOCX · 追问项都有默认值，可直接生成",
  "chat.uploading": "正在解析附件...",
  "chat.attachments": "附件",
  "chat.attachmentOnly": "请根据我上传的附件生成化学 3D 教学场景。",
  "chat.uploadFallback": "附件已添加，但本地上传接口暂不可用，将尽量结合文件名和说明生成。",

  // Preset questions
  "preset.1": "甲烷分子结构，要能看出正四面体和 sp3 杂化",
  "preset.2": "实验室制取氧气的装置，显示导管、集气瓶和气体流向",

  // Tool indicators
  "tool.parse": "解析",
  "tool.attachment": "附件",
  "tool.clarify": "追问",
  "tool.template": "模板",
  "tool.spec": "规划",
  "tool.render": "生成",
  "tool.deploy": "发布",

  // Clarify card
  "clarify.generateWithOptions": "使用选项生成",
  "clarify.direct": "直接生成",

  // Preview panel
  "preview.kicker": "Scene Preview",
  "preview.title": "3D 场景预览",
  "preview.debug": "调试",
  "preview.idle": "等待输入",
  "preview.idleHint": "生成进度会显示在这里",
  "preview.emptyTitle": "还没有 3D 场景",
  "preview.emptyHint": "发送教学需求后，系统会先确认可选细节，再生成可旋转缩放的 Three.js 页面。",
  "preview.error": "生成失败",
  "preview.regenerate": "重新生成",
  "preview.download": "下载 HTML",
  "preview.copyLink": "复制链接",
  "preview.waitDeploy": "等待发布",

  // Status & errors
  "status.error": "请求失败，请检查后端服务是否正常运行。",
  "status.stopped": "*已停止生成*",
  "status.backendError": "后端中止请求失败，服务器可能仍在运行。",

  // Debug panel
  "debug.title": "传输流",
  "debug.events": "事件",
  "debug.back": "预览",
  "debug.clear": "清除",
  "debug.empty": "等待 SSE 事件...",
  "debug.emptyHint": "发送消息后，所有原始后端数据将在此处显示。",

  // Conversation sidebar
  "sidebar.label": "会话列表",
  "sidebar.title": "场景会话",
  "sidebar.newChat": "新建",
  "sidebar.loading": "正在加载会话...",
  "sidebar.loadMore": "加载更多",
  "sidebar.loadingMore": "加载中...",
  "sidebar.emptyTitle": "暂无会话",
  "sidebar.emptyHint": "新建一个化学 3D 场景。",
  "sidebar.delete": "删除会话",
  "sidebar.deleteConfirm": "确定要永久删除这个会话吗？此操作不可恢复。",

  // Aria labels
  "aria.send": "发送",
  "aria.clearHistory": "删除当前会话",
  "aria.stopGeneration": "停止生成",
  "aria.attachFile": "添加图片或文件",
  "aria.removeAttachment": "移除附件",

  // Language toggle
  "lang.switch": "English",

  // Floating bottom-right action badges
  "floatingLink.deploy": "一键部署",
  "floatingLink.github": "GitHub",
} as const;

export default zh;
