// Agent 工具定义
import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { deepseek, MODEL_NAME } from '../services/deepseek.js';
import { matchTemplate, getTemplate } from '../templates/registry.js';
import { findMolecule } from '../templates/_shared/coordinates.js';
import { saveGeneratedHtml } from '../services/storage.js';
import { deployToEdgeOne } from '../services/edgeone.js';
import type { ParsedInput, Atom, Bond } from '../types/index.js';
import { nanoid } from 'nanoid';

// 工具1：解析用户输入
export const parseInputTool = tool({
  description: '解析用户输入，提取建模对象、知识点、教学目标。在对话开始时必须调用一次。hasImage 和 hasFile 根据用户是否上传图片/文件来传 true/false。extractedText 是从文件中提取的文本内容。',
  parameters: z.object({
    userInput: z.string().describe('用户的原始输入文本'),
    hasImage: z.boolean().describe('用户是否上传了图片'),
    hasFile: z.boolean().describe('用户是否上传了文件'),
    extractedText: z.string().optional().describe('从用户上传文件中提取的文本内容'),
  }),
  execute: async ({ userInput, hasImage, hasFile, extractedText }) => {
    const fullText = [userInput, extractedText].filter(Boolean).join('\n\n[文件内容]\n');

    // 用 LLM 做结构化解析
    const { text } = await generateText({
      model: deepseek(MODEL_NAME),
      system: '你是一个化学教学需求解析器。分析用户的输入，提取结构化信息。只返回 JSON，不要其他文字。',
      prompt: `分析以下用户输入，提取化学建模需求。

用户输入：
${fullText}

返回 JSON 格式（只返回 JSON，不要 markdown 代码块）：
{
  "subject": "chemistry",
  "modelingObject": "建模对象，如"甲烷分子"、"乙烯加成反应"、"氯化钠晶体"",
  "knowledgePoint": "涉及的知识点，如"sp3杂化、正四面体"",
  "teachingGoal": "教学目标，如"理解甲烷的立体结构"",
  "confidence": 0.0到1.0的置信度,
  "suggestedTemplate": "molecule-3d 或 reaction-3d 或 crystal-3d",
  "missingInfo": ["缺失的信息列表"]
}

判断 suggestedTemplate 的规则：
- 分子、结构、杂化、键角 → molecule-3d
- 反应、方程式、燃烧、化合分解 → reaction-3d
- 晶体、晶胞、晶格、离子晶体 → crystal-3d`,
      temperature: 0.3,
    });

    try {
      // 清理可能的 markdown 代码块标记
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);
      const result: ParsedInput = {
        subject: parsed.subject || 'chemistry',
        modelingObject: parsed.modelingObject || userInput.slice(0, 50),
        knowledgePoint: parsed.knowledgePoint || '',
        teachingGoal: parsed.teachingGoal || '',
        confidence: parsed.confidence || 0.5,
        suggestedTemplate: parsed.suggestedTemplate || 'molecule-3d',
        missingInfo: parsed.missingInfo || [],
        rawText: userInput,
      };
      return result;
    } catch {
      return {
        subject: 'chemistry',
        modelingObject: userInput.slice(0, 50),
        knowledgePoint: '',
        teachingGoal: '',
        confidence: 0.3,
        suggestedTemplate: 'molecule-3d',
        missingInfo: ['无法精确解析，使用默认值'],
        rawText: userInput,
      } as ParsedInput;
    }
  },
});

// 工具2：追问确认
export const clarifyTool = tool({
  description: '当输入信息不足时，向用户提出追问以确认建模细节。每轮最多3个问题。仅在信息明显不足时调用，不要过度追问。',
  parameters: z.object({
    questions: z.array(z.object({
      field: z.string().describe('问题字段标识，如 atoms, bonds, interaction, color'),
      question: z.string().describe('向用户展示的问题文本'),
      defaultValue: z.string().optional().describe('建议的默认值'),
      options: z.array(z.string()).optional().describe('可选选项列表'),
    })).describe('问题列表，最多3个'),
  }),
  execute: async ({ questions }) => {
    return {
      status: 'awaiting_user',
      questions: questions.slice(0, 3),
      message: '请回答以上问题，或回复"跳过"直接生成。',
    };
  },
});

// 工具3：生成代码
export const generateCodeTool = tool({
  description: '根据解析和确认的信息，生成 Three.js 3D 教学网页。这是核心生成工具。对于常见分子（甲烷、乙烷、乙烯、乙炔、苯、水、二氧化碳、氨、乙醇、葡萄糖、氯化钠），atoms 和 bonds 传空数组 [] 即可，模板会自动查找预置坐标。',
  parameters: z.object({
    templateId: z.enum(['molecule-3d', 'reaction-3d', 'crystal-3d']).describe('模板ID'),
    title: z.string().describe('页面标题，如"甲烷分子结构"'),
    description: z.string().optional().describe('页面说明文字'),
    // 分子模板参数
    atoms: z.array(z.object({
      element: z.string().describe('元素符号，如 C, H, O'),
      position: z.array(z.number()).length(3).describe('3D坐标 [x,y,z]，单位 Angstrom'),
      label: z.string().optional().describe('标签，如 C1, H1'),
    })).optional().describe('原子列表。常见分子传空数组，未知分子需提供坐标'),
    bonds: z.array(z.object({
      from: z.number().describe('起始原子索引'),
      to: z.number().describe('目标原子索引'),
      type: z.enum(['single', 'double', 'triple']).describe('键类型'),
    })).optional().describe('化学键列表'),
    colorScheme: z.enum(['cpk', 'soft', 'highContrast']).default('cpk').describe('配色方案'),
    language: z.enum(['zh', 'en']).default('zh').describe('界面语言'),
    showLabels: z.boolean().default(true).describe('是否显示原子标签'),
    showBondLength: z.boolean().default(false).describe('是否显示键长'),
    // 反应模板参数
    steps: z.array(z.object({
      label: z.string().describe('步骤名称，如"反应物"'),
      atoms: z.array(z.object({
        element: z.string(),
        position: z.array(z.number()).length(3),
        label: z.string().optional(),
      })),
      bonds: z.array(z.object({
        from: z.number(),
        to: z.number(),
        type: z.enum(['single', 'double', 'triple']),
      })),
    })).optional().describe('化学反应的步骤列表（仅 reaction-3d 模板使用）'),
    // 晶体模板参数
    crystalType: z.enum(['nacl', 'diamond', 'simple-cubic', 'bcc', 'fcc']).optional().describe('晶体类型（仅 crystal-3d 使用）'),
  }),
  execute: async (params) => {
    const template = getTemplate(params.templateId);
    if (!template) {
      return { success: false, error: `模板不存在: ${params.templateId}` };
    }

    try {
      // 构建模板参数
      let templateParams: any = {
        title: params.title,
        description: params.description || '',
        colorScheme: params.colorScheme || 'cpk',
        language: params.language || 'zh',
      };

      if (params.templateId === 'molecule-3d') {
        templateParams.atoms = params.atoms || [];
        templateParams.bonds = params.bonds || [];
        templateParams.interactions = ['rotate', 'zoom', 'annotate'];
        templateParams.showLabels = params.showLabels ?? true;
        templateParams.showBondLength = params.showBondLength ?? false;
      } else if (params.templateId === 'reaction-3d') {
        templateParams.steps = params.steps || [];
        templateParams.interactions = ['rotate', 'zoom', 'animate'];
      } else if (params.templateId === 'crystal-3d') {
        templateParams.crystalType = params.crystalType || 'nacl';
        templateParams.interactions = ['rotate', 'zoom'];
      }

      // 渲染 HTML
      const html = template.render(templateParams);
      const id = nanoid(10);
      const dir = await saveGeneratedHtml(html, id);

      return {
        success: true,
        id,
        htmlPath: dir,
        htmlContent: html,  // 用于 mcporter 免登录部署
        previewUrl: `/api/preview/${id}`,
        htmlLength: html.length,
        template: params.templateId,
      };
    } catch (err: any) {
      return { success: false, error: err.message || '生成失败' };
    }
  },
});

// 工具4：部署
export const deployTool = tool({
  description: '将生成的 HTML 页面部署到腾讯 EdgeOne，返回公网访问 URL。默认使用免登录的 mcporter 方式，无需配置 Token。传入 generate 工具返回的 htmlPath，或直接传 htmlContent。',
  parameters: z.object({
    htmlPath: z.string().describe('generate 工具返回的 htmlPath（目录路径）'),
    htmlContent: z.string().optional().describe('HTML 内容（如有则优先使用，免登录部署需要）'),
    projectName: z.string().optional().describe('项目名称，仅 CLI 方式使用'),
  }),
  execute: async ({ htmlPath, htmlContent, projectName }) => {
    const name = projectName || `chemscene-${nanoid(6)}`;
    const result = await deployToEdgeOne(htmlPath, htmlContent, name);

    if (result.success) {
      return {
        success: true,
        url: result.url,
        projectId: result.projectId,
        message: `部署成功！访问链接：${result.url}`,
      };
    } else {
      return {
        success: false,
        error: result.error || '部署失败',
        fallback: '页面已在本地生成，可通过预览链接访问。部署失败原因：' + (result.error || '未知'),
      };
    }
  },
});

// 导出所有工具的集合
export const allTools = {
  parseInput: parseInputTool,
  clarify: clarifyTool,
  generate: generateCodeTool,
  deploy: deployTool,
};
