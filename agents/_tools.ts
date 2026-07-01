/**
 * ChemScene Agent tools.
 *
 * The runtime chat handler now uses model-generated Scene Spec output first,
 * with local scene functions as validation and fallback helpers. These tools
 * are kept for OpenAI Agents SDK compatibility and future orchestration.
 */

import { tool } from '@openai/agents';
import { z } from 'zod';
import {
  buildSceneSpec,
  createClarifyCard,
  parseChemRequest,
  renderThreeJsHtml,
} from './_chemScene';

const attachmentSchema = z.object({
  id: z.string().optional(),
  type: z.string().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  caption: z.string().optional(),
  extractedText: z.string().optional(),
  summary: z.string().optional(),
  error: z.string().optional(),
});

const parseChemRequestTool = tool({
  name: 'parse_chem_request',
  description: '解析化学教学建模需求，提取建模对象、知识点、教学目标和推荐模板。',
  parameters: z.object({
    rawInput: z.string().describe('用户原始输入'),
    attachments: z.array(attachmentSchema).default([]).describe('已经上传并解析的附件摘要'),
  }),
  execute: async ({ rawInput, attachments }) =>
    JSON.stringify(parseChemRequest(rawInput, attachments)),
});

const analyzeAttachmentTool = tool({
  name: 'analyze_attachment',
  description: '整理图片或文件附件中的化学线索。图片解析依赖上游 Vision 模型或用户说明。',
  parameters: z.object({
    attachments: z.array(attachmentSchema).default([]),
  }),
  execute: async ({ attachments }) => {
    const summary = attachments.map((item) => ({
      fileName: item.fileName,
      type: item.type,
      summary: item.summary || item.extractedText || item.caption || '已接收附件，等待结合用户文字分析。',
      error: item.error,
    }));
    return JSON.stringify({ attachments: summary });
  },
});

const createClarifyCardTool = tool({
  name: 'create_clarify_card',
  description: '根据解析结果生成选项式追问卡片。所有问题必须可选并提供默认值。',
  parameters: z.object({
    rawInput: z.string(),
    attachments: z.array(attachmentSchema).default([]),
  }),
  execute: async ({ rawInput, attachments }) =>
    JSON.stringify(createClarifyCard(parseChemRequest(rawInput, attachments))),
});

const matchSceneTemplateTool = tool({
  name: 'match_scene_template',
  description: '从 6 类化学 3D 场景模板中选择最合适模板。',
  parameters: z.object({
    rawInput: z.string(),
    attachments: z.array(attachmentSchema).default([]),
  }),
  execute: async ({ rawInput, attachments }) => {
    const parsed = parseChemRequest(rawInput, attachments);
    return JSON.stringify({
      templateId: parsed.templateId,
      reason: `根据“${parsed.modelingObject}”和“${parsed.knowledgePoint}”匹配。`,
      confidence: parsed.confidence,
    });
  },
});

const generateSceneSpecTool = tool({
  name: 'generate_scene_spec',
  description: '生成结构化 Scene Spec，用于稳定渲染 Three.js 页面。',
  parameters: z.object({
    rawInput: z.string(),
    attachments: z.array(attachmentSchema).default([]),
    selections: z.record(z.string(), z.unknown()).default({}),
  }),
  execute: async ({ rawInput, attachments, selections }) =>
    JSON.stringify(buildSceneSpec(parseChemRequest(rawInput, attachments), selections)),
});

const renderThreeJsHtmlTool = tool({
  name: 'render_threejs_html',
  description: '根据 Scene Spec 渲染单文件 Three.js HTML。',
  parameters: z.object({
    sceneSpec: z.record(z.string(), z.unknown()),
  }),
  execute: async ({ sceneSpec }) => {
    const htmlContent = renderThreeJsHtml(sceneSpec as any);
    return JSON.stringify({
      sceneId: String(sceneSpec.sceneId ?? ''),
      htmlContent,
      bytes: htmlContent.length,
    });
  },
});

const deploySceneToEdgeOneTool = tool({
  name: 'deploy_scene_to_edgeone',
  description: '发布生成场景。当前模板通过同一 EdgeOne 应用的 /scene 公开路由发布场景。',
  parameters: z.object({
    sceneId: z.string(),
    sceneUrl: z.string(),
  }),
  execute: async ({ sceneId, sceneUrl }) =>
    JSON.stringify({
      success: true,
      sceneId,
      url: sceneUrl,
      strategy: 'edgeone-app-scene-route',
      deployedAt: new Date().toISOString(),
    }),
});

export function createTools() {
  return [
    parseChemRequestTool,
    analyzeAttachmentTool,
    createClarifyCardTool,
    matchSceneTemplateTool,
    generateSceneSpecTool,
    renderThreeJsHtmlTool,
    deploySceneToEdgeOneTool,
  ];
}
