/**
 * Custom tools -- private module
 * 4个自定义工具：parse_input, clarify, generate, deploy
 * 直接注册为 OpenAI function calling 格式
 */

import { matchTemplate, getTemplate } from '../shared/templates/registry.js';
import { findMolecule } from '../shared/templates/_shared/coordinates.js';
import { generateText } from './_llm-helper.js';
import { deployHtml } from './_deploy.js';
import { nanoid } from 'nanoid';

type ToolSchema = Record<string, unknown>;

export class ToolRegistry {
  tools: ToolSchema[] = [];
  private handlers: Map<string, (args: Record<string, unknown>) => Promise<string>> = new Map();

  hasTools(): boolean { return this.tools.length > 0; }

  register(name: string, schema: ToolSchema, handler: (args: Record<string, unknown>) => Promise<string>): void {
    if (this.handlers.has(name)) return;
    this.tools.push(schema);
    this.handlers.set(name, handler);
  }

  async execute(name: string, argumentsStr: string): Promise<string> {
    const handler = this.handlers.get(name);
    if (!handler) return JSON.stringify({ error: `Unknown tool: ${name}` });
    let args: Record<string, unknown> = {};
    try { args = argumentsStr ? JSON.parse(argumentsStr) : {}; } catch { args = {}; }
    try { return await handler(args); }
    catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return JSON.stringify({ error: msg });
    }
  }
}

export function buildCustomTools(context: any): ToolRegistry {
  const registry = new ToolRegistry();

  // 工具1：解析输入
  registry.register('parse_input', {
    type: 'function',
    function: {
      name: 'parse_input',
      description: '解析用户输入，提取建模对象、知识点、教学目标。在对话开始时必须调用一次。',
      parameters: {
        type: 'object',
        properties: {
          userInput: { type: 'string', description: '用户的原始输入文本' },
          hasImage: { type: 'boolean', description: '用户是否上传了图片' },
          hasFile: { type: 'boolean', description: '用户是否上传了文件' },
          extractedText: { type: 'string', description: '从用户上传文件中提取的文本内容' },
        },
        required: ['userInput'],
      },
    },
  }, async (args) => {
    const userInput = String(args.userInput || '');
    const extractedText = String(args.extractedText || '');
    const fullText = [userInput, extractedText].filter(Boolean).join('\n\n[文件内容]\n');

    const modelConfig = (await import('./_model.js')).getModelConfig(context.env);
    const prompt = `分析以下用户输入，提取化学建模需求。只返回 JSON，不要其他文字。

用户输入：
${fullText}

返回 JSON：
{
  "subject": "chemistry",
  "modelingObject": "建模对象",
  "knowledgePoint": "知识点",
  "teachingGoal": "教学目标",
  "confidence": 0.0到1.0,
  "suggestedTemplate": "molecule-3d 或 reaction-3d 或 crystal-3d",
  "missingInfo": ["缺失信息"]
}

判断规则：分子/结构/杂化/键角 → molecule-3d；反应/方程式/燃烧 → reaction-3d；晶体/晶胞/晶格 → crystal-3d`;

    const text = await generateText(modelConfig, [
      { role: 'system', content: '你是化学教学需求解析器。只返回JSON。' },
      { role: 'user', content: prompt },
    ]);

    try {
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return JSON.stringify({
        subject: 'chemistry',
        modelingObject: parsed.modelingObject || userInput.slice(0, 50),
        knowledgePoint: parsed.knowledgePoint || '',
        teachingGoal: parsed.teachingGoal || '',
        confidence: parsed.confidence || 0.5,
        suggestedTemplate: parsed.suggestedTemplate || 'molecule-3d',
        missingInfo: parsed.missingInfo || [],
        rawText: userInput,
      });
    } catch {
      return JSON.stringify({
        subject: 'chemistry',
        modelingObject: userInput.slice(0, 50),
        knowledgePoint: '', teachingGoal: '',
        confidence: 0.3, suggestedTemplate: 'molecule-3d',
        missingInfo: ['解析失败，使用默认值'], rawText: userInput,
      });
    }
  });

  // 工具2：追问确认
  registry.register('clarify', {
    type: 'function',
    function: {
      name: 'clarify',
      description: '当输入信息不足时，向用户提出追问以确认建模细节。每轮最多3个问题。仅在信息明显不足时调用。',
      parameters: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                question: { type: 'string' },
                defaultValue: { type: 'string' },
                options: { type: 'array', items: { type: 'string' } },
              },
              required: ['field', 'question'],
            },
            description: '问题列表，最多3个',
          },
        },
        required: ['questions'],
      },
    },
  }, async (args) => {
    const questions = (args.questions as any[]) || [];
    return JSON.stringify({
      status: 'awaiting_user',
      questions: questions.slice(0, 3),
      message: '请回答以上问题，或回复"跳过"直接生成。',
    });
  });

  // 工具3：生成代码
  registry.register('generate', {
    type: 'function',
    function: {
      name: 'generate',
      description: '根据解析和确认的信息，生成 Three.js 3D 教学网页。对于常见分子，atoms 和 bonds 传空数组 [] 即可。',
      parameters: {
        type: 'object',
        properties: {
          templateId: { type: 'string', enum: ['molecule-3d', 'reaction-3d', 'crystal-3d'], description: '模板ID' },
          title: { type: 'string', description: '页面标题' },
          description: { type: 'string', description: '页面说明' },
          atoms: { type: 'array', items: { type: 'object' }, description: '原子列表。常见分子传空数组' },
          bonds: { type: 'array', items: { type: 'object' }, description: '化学键列表' },
          colorScheme: { type: 'string', enum: ['cpk', 'soft', 'highContrast'], description: '配色方案，默认cpk' },
          showLabels: { type: 'boolean', description: '是否显示原子标签，默认true' },
          crystalType: { type: 'string', enum: ['nacl', 'diamond', 'simple-cubic', 'bcc', 'fcc'], description: '晶体类型（仅crystal-3d）' },
          steps: { type: 'array', items: { type: 'object' }, description: '化学反应步骤（仅reaction-3d）' },
        },
        required: ['templateId', 'title'],
      },
    },
  }, async (args) => {
    const templateId = String(args.templateId);
    const template = getTemplate(templateId);
    if (!template) return JSON.stringify({ success: false, error: `模板不存在: ${templateId}` });

    const templateParams: any = {
      title: String(args.title || ''),
      description: String(args.description || ''),
      colorScheme: args.colorScheme || 'cpk',
      language: 'zh',
    };

    if (templateId === 'molecule-3d') {
      templateParams.atoms = args.atoms || [];
      templateParams.bonds = args.bonds || [];
      templateParams.interactions = ['rotate', 'zoom', 'annotate'];
      templateParams.showLabels = args.showLabels ?? true;
      templateParams.showBondLength = false;
    } else if (templateId === 'reaction-3d') {
      templateParams.steps = args.steps || [];
      templateParams.interactions = ['rotate', 'zoom', 'animate'];
    } else if (templateId === 'crystal-3d') {
      templateParams.crystalType = args.crystalType || 'nacl';
      templateParams.interactions = ['rotate', 'zoom'];
    }

    const html = template.render(templateParams);
    const id = nanoid(10);
    return JSON.stringify({
      success: true,
      id,
      htmlContent: html,
      htmlLength: html.length,
      template: templateId,
      previewUrl: `/preview?id=${id}`,
    });
  });

  // 工具4：部署
  registry.register('deploy', {
    type: 'function',
    function: {
      name: 'deploy',
      description: '将生成的 HTML 页面部署到 EdgeOne，返回公网访问 URL。',
      parameters: {
        type: 'object',
        properties: {
          htmlContent: { type: 'string', description: 'generate 工具返回的 htmlContent' },
        },
        required: ['htmlContent'],
      },
    },
  }, async (args) => {
    const htmlContent = String(args.htmlContent || '');
    if (!htmlContent) return JSON.stringify({ success: false, error: 'htmlContent 为空' });

    const result = await deployHtml(htmlContent);
    return JSON.stringify(result);
  });

  return registry;
}
