const en = {
  // Header
  "app.title": "ChemScene Agent",
  "app.subtitle": "Generate previewable and publishable chemistry 3D teaching pages",

  // Empty state
  "empty.title": "Start with a teaching goal",
  "empty.hint": "Describe a molecule, reaction, crystal, orbital, chemical equipment, or lab apparatus. You can also attach structure images, lesson PDFs, TXT, or DOCX files.",
  "empty.features": "Three.js preview · Optional spec cards · EdgeOne public link",

  // Chat input
  "chat.placeholder": "Example: methane structure with tetrahedral geometry and sp3 hybridization",
  "chat.hint": "Supports JPG/PNG/PDF/TXT/DOCX · Every clarification has defaults",
  "chat.uploading": "Parsing attachments...",
  "chat.attachments": "Attachments",
  "chat.attachmentOnly": "Generate a chemistry 3D teaching scene from the attachments I uploaded.",
  "chat.uploadFallback": "Attachment added, but the upload endpoint is unavailable locally. File name and notes will still be used.",

  // Preset questions
  "preset.1": "Methane structure showing tetrahedral geometry and sp3 hybridization",
  "preset.2": "Lab oxygen preparation apparatus with tube, gas jar, and gas flow",

  // Tool indicators
  "tool.parse": "Parse",
  "tool.attachment": "Files",
  "tool.clarify": "Spec",
  "tool.template": "Template",
  "tool.spec": "Plan",
  "tool.render": "Render",
  "tool.deploy": "Publish",

  // Clarify card
  "clarify.generateWithOptions": "Generate with options",
  "clarify.direct": "Generate directly",

  // Preview panel
  "preview.kicker": "Scene Preview",
  "preview.title": "3D scene preview",
  "preview.debug": "Debug",
  "preview.idle": "Waiting for input",
  "preview.idleHint": "Generation progress will appear here",
  "preview.emptyTitle": "No 3D scene yet",
  "preview.emptyHint": "Send a teaching request. The agent will confirm optional details, then generate a rotatable Three.js page.",
  "preview.error": "Generation failed",
  "preview.regenerate": "Regenerate",
  "preview.download": "Download HTML",
  "preview.copyLink": "Copy link",
  "preview.waitDeploy": "Waiting",

  // Status & errors
  "status.error": "Request failed. Please check if the backend service is running.",
  "status.stopped": "*Generation stopped*",
  "status.backendError": "Backend abort request failed. The server may still be running.",

  // Debug panel
  "debug.title": "Trace",
  "debug.events": "events",
  "debug.back": "Preview",
  "debug.clear": "Clear",
  "debug.empty": "Waiting for SSE events...",
  "debug.emptyHint": "After sending a message, all raw backend data will be displayed here.",

  // Conversation sidebar
  "sidebar.label": "Conversation list",
  "sidebar.title": "Scenes",
  "sidebar.newChat": "New",
  "sidebar.loading": "Loading conversations...",
  "sidebar.loadMore": "Load more",
  "sidebar.loadingMore": "Loading...",
  "sidebar.emptyTitle": "No conversations yet",
  "sidebar.emptyHint": "Create a chemistry 3D scene.",
  "sidebar.delete": "Delete conversation",
  "sidebar.deleteConfirm": "Permanently delete this conversation? This cannot be undone.",

  // Aria labels
  "aria.send": "Send",
  "aria.clearHistory": "Delete current conversation",
  "aria.stopGeneration": "Stop generation",
  "aria.attachFile": "Attach image or file",
  "aria.removeAttachment": "Remove attachment",

  // Language toggle
  "lang.switch": "中文",

  // Floating bottom-right action badges
  "floatingLink.deploy": "Deploy",
  "floatingLink.github": "GitHub",
} as const;

export default en;
