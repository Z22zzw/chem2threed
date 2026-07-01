import OpenAI from 'openai';
import {
  buildSceneSpec,
  type AttachmentInput,
  type ParsedChemRequest,
  type SceneSpec,
  type SceneTemplateId,
} from './_chemScene';

const DEFAULT_MODEL = '@makers/deepseek-v4-flash';

const TEMPLATE_IDS: SceneTemplateId[] = [
  'molecule-3d',
  'reaction-3d',
  'crystal-3d',
  'orbital-3d',
  'equipment-3d',
  'apparatus-3d',
];

const DISPLAY_MODES = ['ball_stick', 'space_filling', 'mixed'] as const;
const BACKGROUNDS = ['light', 'dark'] as const;
const COLOR_SCHEMES = ['cpk', 'soft', 'highContrast'] as const;

export interface ModelSceneResult {
  spec: SceneSpec;
  source: 'model' | 'fallback';
  model?: string;
  error?: string;
}

function envOf(context: any): Record<string, string | undefined> {
  return {
    ...(typeof process !== 'undefined' ? process.env : {}),
    ...((context?.env ?? {}) as Record<string, string | undefined>),
  };
}

function defaultModelForBaseUrl(baseURL: string | undefined): string {
  const normalized = String(baseURL ?? '').toLowerCase();
  if (normalized.includes('deepseek')) return 'deepseek-chat';
  if (normalized.includes('openai')) return 'gpt-4o-mini';
  return DEFAULT_MODEL;
}

function summarizeModelError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const status = raw.match(/\b(4\d\d|5\d\d)\b/)?.[1];
  if (/request blocked/i.test(raw)) {
    return `模型服务返回 ${status ?? ''} Request Blocked`.replace(/\s+/g, ' ').trim();
  }
  if (/<html[\s>]/i.test(raw) || /<!doctype html/i.test(raw)) {
    return `模型服务返回 ${status ?? ''} HTML 错误页`.replace(/\s+/g, ' ').trim();
  }
  return raw.replace(/\s+/g, ' ').slice(0, 220);
}

function pickString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function pickEnum<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]): T[number] {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? value as T[number]
    : fallback;
}

function pickStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map(item => item.trim());
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : fallback;
}

function normalizeTemplateId(value: unknown, fallback: SceneTemplateId): SceneTemplateId {
  return pickEnum(value, TEMPLATE_IDS, fallback);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizePosition(value: unknown): [number, number, number] | null {
  if (!Array.isArray(value) || value.length < 3) return null;
  const xyz = value.slice(0, 3);
  if (!xyz.every(isFiniteNumber)) return null;
  return [
    Math.max(-5, Math.min(5, xyz[0])),
    Math.max(-5, Math.min(5, xyz[1])),
    Math.max(-5, Math.min(5, xyz[2])),
  ];
}

function normalizeAtoms(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      if (!isRecord(item)) return null;
      const element = pickString(item.element, '');
      const position = normalizePosition(item.position);
      if (!element || !position) return null;
      return {
        element,
        position,
        label: pickString(item.label, element),
      };
    })
    .filter((item): item is { element: string; position: [number, number, number]; label: string } => item !== null)
    .slice(0, 80);
}

function normalizeBonds(value: unknown, atomCount: number): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      if (!isRecord(item)) return null;
      const from = Number(item.from);
      const to = Number(item.to);
      if (!Number.isInteger(from) || !Number.isInteger(to)) return null;
      if (from < 0 || to < 0 || from >= atomCount || to >= atomCount || from === to) return null;
      return {
        from,
        to,
        type: pickEnum(item.type, ['single', 'double', 'triple'] as const, 'single'),
      };
    })
    .filter((item): item is { from: number; to: number; type: 'single' | 'double' | 'triple' } => item !== null)
    .slice(0, 120);
}

function normalizeAnnotations(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      if (!isRecord(item)) return null;
      const label = pickString(item.label, '');
      if (!label) return null;
      return {
        type: pickString(item.type, 'note'),
        label,
        position: normalizePosition(item.position) ?? [0, 1.6, 0],
      };
    })
    .filter((item): item is { type: string; label: string; position: [number, number, number] } => item !== null)
    .slice(0, 20);
}

function normalizeMolecule(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const atoms = normalizeAtoms(value.atoms);
  if (atoms.length === 0) return null;
  return {
    label: pickString(value.label, ''),
    formula: pickString(value.formula, ''),
    atoms,
    bonds: normalizeBonds(value.bonds, atoms.length),
    annotations: normalizeAnnotations(value.annotations),
  };
}

function normalizeMoleculeList(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeMolecule)
    .filter((item): item is Record<string, unknown> => item !== null)
    .slice(0, 8);
}

function normalizeChemistry(
  templateId: SceneTemplateId,
  raw: unknown,
  fallback: Record<string, unknown>,
): Record<string, unknown> {
  if (!isRecord(raw)) return fallback;

  if (templateId === 'molecule-3d') {
    const molecule = normalizeMolecule(raw);
    return molecule ? { ...raw, ...molecule } : fallback;
  }

  if (templateId === 'reaction-3d') {
    const reactants = normalizeMoleculeList(raw.reactants);
    const products = normalizeMoleculeList(raw.products);
    return {
      ...raw,
      equation: pickString(raw.equation, String(fallback.equation ?? '')),
      steps: pickStringArray(raw.steps, Array.isArray(fallback.steps) ? fallback.steps as string[] : []),
      ...(reactants.length > 0 ? { reactants } : {}),
      ...(products.length > 0 ? { products } : {}),
    };
  }

  if (templateId === 'orbital-3d') {
    return {
      ...raw,
      orbitalType: pickString(raw.orbitalType, String(fallback.orbitalType ?? 'sp3')),
      angle: pickString(raw.angle, String(fallback.angle ?? '109.5°')),
    };
  }

  if (templateId === 'crystal-3d') {
    return {
      ...raw,
      lattice: pickString(raw.lattice, String(fallback.lattice ?? 'generic_lattice')),
      repeat: Number.isFinite(Number(raw.repeat)) ? Math.max(2, Math.min(5, Number(raw.repeat))) : fallback.repeat ?? 3,
      ions: pickStringArray(raw.ions, Array.isArray(fallback.ions) ? fallback.ions as string[] : ['Na+', 'Cl-']),
    };
  }

  return {
    ...raw,
    parts: pickStringArray(raw.parts, Array.isArray(fallback.parts) ? fallback.parts as string[] : []),
  };
}

function normalizeModelSpec(
  value: unknown,
  fallback: SceneSpec,
  selections: Record<string, unknown>,
): SceneSpec {
  if (!isRecord(value)) throw new Error('Model response is not a JSON object.');

  // Model intent must win over UI defaults. Clarification cards submit default
  // values even when the user did not actively change them, so using
  // selections.template_id first can incorrectly force a reaction into the
  // default molecule renderer.
  const selectedTemplate = typeof value.templateId === 'string'
    ? value.templateId
    : selections.template_id;
  const templateId = normalizeTemplateId(selectedTemplate, fallback.templateId);

  const rawVisual = isRecord(value.visualStyle) ? value.visualStyle : {};
  const fallbackVisual = fallback.visualStyle;

  return {
    sceneId: fallback.sceneId,
    templateId,
    title: pickString(value.title, fallback.title),
    teachingGoal: pickString(value.teachingGoal, fallback.teachingGoal),
    language: pickEnum(value.language, ['zh', 'en'] as const, fallback.language),
    visualStyle: {
      colorScheme: pickEnum(rawVisual.colorScheme, COLOR_SCHEMES, fallbackVisual.colorScheme),
      background: pickEnum(rawVisual.background, BACKGROUNDS, fallbackVisual.background),
      displayMode: pickEnum(rawVisual.displayMode, DISPLAY_MODES, fallbackVisual.displayMode),
    },
    interactions: pickStringArray(value.interactions, fallback.interactions),
    chemistry: normalizeChemistry(templateId, value.chemistry, fallback.chemistry),
  };
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);

  throw new Error('Model response did not contain JSON.');
}

function buildPrompt(
  parsed: ParsedChemRequest,
  selections: Record<string, unknown>,
  attachments: AttachmentInput[],
  fallback: SceneSpec,
): string {
  return [
    '你是一个化学 3D 教学场景规划 agent。请根据用户需求生成一个可渲染的 Scene Spec JSON。',
    '只输出 JSON，不要输出 Markdown，不要解释。',
    '',
    '必须遵守：',
    '- templateId 只能是 molecule-3d / reaction-3d / crystal-3d / orbital-3d / equipment-3d / apparatus-3d。',
    '- title、teachingGoal 使用中文，面向课堂教学。',
    '- visualStyle.colorScheme 只能是 cpk / soft / highContrast。',
    '- visualStyle.background 只能是 light / dark。',
    '- visualStyle.displayMode 只能是 ball_stick / space_filling / mixed。',
    '- interactions 至少包含 rotate 和 zoom，可加入 atom_label、bond_angle、key_note、animate。',
    '- molecule-3d 的 chemistry 必须包含 atoms 和 bonds。atoms 使用 { element, position:[x,y,z], label }，bonds 使用 { from, to, type }，下标从 0 开始。',
    '- reaction-3d 的 chemistry 应包含 equation、steps；如果能表达分子，请补充 reactants/products，结构同 molecule。',
    '- 出现硝化、皂化、燃烧、水解、酯化、取代、加成、氧化还原等反应过程时，templateId 必须是 reaction-3d；不要因为出现苯、甲烷等单个分子名就降级为 molecule-3d。',
    '- “苯和浓硝酸的硝化反应 / benzene nitration”应生成苯、浓硝酸、硝基苯、水和 NO2+ 相关步骤的 reaction-3d 场景。',
    '- crystal-3d 的 chemistry 包含 lattice、repeat、ions。',
    '- orbital-3d 的 chemistry 包含 orbitalType、angle。',
    '- equipment-3d / apparatus-3d 的 chemistry 包含 parts，并尽量补充 flowLabels 或 safetyNotes。',
    '- 坐标控制在 -5 到 5 范围内，原子数量优先保持在 80 个以内。',
    '',
    '返回 JSON 形状：',
    '{"templateId":"","title":"","teachingGoal":"","language":"zh","visualStyle":{"colorScheme":"cpk","background":"dark","displayMode":"mixed"},"interactions":["rotate","zoom"],"chemistry":{}}',
    '',
    `用户原始需求：${parsed.rawInput}`,
    `离线解析参考：${JSON.stringify({
      templateId: parsed.templateId,
      modelingObject: parsed.modelingObject,
      knowledgePoint: parsed.knowledgePoint,
      teachingGoal: parsed.teachingGoal,
      attachmentSummary: parsed.attachmentSummary,
    })}`,
    `用户选项：${JSON.stringify(selections ?? {})}`,
    `附件：${JSON.stringify(attachments.map(item => ({
      fileName: item.fileName,
      type: item.type,
      caption: item.caption,
      summary: item.summary,
      extractedText: item.extractedText?.slice(0, 1600),
    })))}`,
    `兜底 Scene Spec 参考：${JSON.stringify(fallback)}`,
  ].join('\n');
}

export async function buildSceneSpecWithModel(
  context: any,
  parsed: ParsedChemRequest,
  selections: Record<string, unknown> = {},
  attachments: AttachmentInput[] = [],
): Promise<ModelSceneResult> {
  const fallback = buildSceneSpec(parsed, selections);
  const env = envOf(context);
  const apiKey = env.AI_GATEWAY_API_KEY || env.OPENAI_API_KEY;
  const baseURL = env.AI_GATEWAY_BASE_URL || env.OPENAI_BASE_URL ||
    (env.OPENAI_API_KEY ? 'https://api.openai.com/v1' : undefined);
  const model = env.AI_GATEWAY_MODEL || env.OPENAI_MODEL || defaultModelForBaseUrl(baseURL);

  if (!apiKey || !baseURL) {
    return {
      spec: fallback,
      source: 'fallback',
      model,
      error: '缺少 AI_GATEWAY_API_KEY/AI_GATEWAY_BASE_URL 或 OPENAI_API_KEY/OPENAI_BASE_URL。',
    };
  }

  try {
    const client = new OpenAI({ apiKey, baseURL });
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: 3500,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: '你只生成严格 JSON。目标是把化学教学需求转换为可稳定渲染的 Three.js 场景规格。',
        },
        {
          role: 'user',
          content: buildPrompt(parsed, selections, attachments, fallback),
        },
      ],
    } as any);

    const content = completion.choices?.[0]?.message?.content;
    if (!content) throw new Error('Model response was empty.');

    const parsedJson = JSON.parse(extractJson(content));
    const spec = normalizeModelSpec(parsedJson, fallback, selections);
    return { spec, source: 'model', model };
  } catch (e) {
    return {
      spec: fallback,
      source: 'fallback',
      model,
      error: summarizeModelError(e),
    };
  }
}
