export type SceneTemplateId =
  | 'molecule-3d'
  | 'reaction-3d'
  | 'crystal-3d'
  | 'orbital-3d'
  | 'equipment-3d'
  | 'apparatus-3d';

export interface AttachmentInput {
  id?: string;
  type?: 'image' | 'file' | string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  caption?: string;
  extractedText?: string;
  summary?: string;
  error?: string;
}

export interface ParsedChemRequest {
  rawInput: string;
  normalizedInput: string;
  templateId: SceneTemplateId;
  modelingObject: string;
  knowledgePoint: string;
  teachingGoal: string;
  moleculeKey?: string;
  confidence: number;
  attachmentSummary: string;
}

export interface ClarifyOption {
  label: string;
  value: string;
}

export interface ClarifyQuestion {
  id: string;
  label: string;
  type: 'single_select' | 'multi_select' | 'toggle' | 'text' | 'number';
  required: false;
  defaultValue: string | string[] | boolean | number;
  options?: ClarifyOption[];
}

export interface ClarifyCard {
  title: string;
  reason: string;
  questions: ClarifyQuestion[];
  actions: {
    primary: string;
    secondary: string;
  };
  defaults: Record<string, string | string[] | boolean | number>;
}

export interface SceneSpec {
  sceneId: string;
  templateId: SceneTemplateId;
  title: string;
  teachingGoal: string;
  language: 'zh' | 'en';
  visualStyle: {
    colorScheme: 'cpk' | 'soft' | 'highContrast';
    background: 'light' | 'dark';
    displayMode: 'ball_stick' | 'space_filling' | 'mixed';
  };
  interactions: string[];
  chemistry: Record<string, unknown>;
}

export interface SceneRecord {
  sceneId: string;
  conversationId: string;
  title: string;
  templateId: SceneTemplateId;
  htmlContent: string;
  sceneSpec: SceneSpec;
  createdAt: string;
}

export const SCENE_RECORD_PREFIX = '__CHEMSCENE_RECORD__';

interface Atom {
  element: string;
  position: [number, number, number];
  label?: string;
}

interface Bond {
  from: number;
  to: number;
  type: 'single' | 'double' | 'triple';
}

interface MoleculeDefinition {
  title: string;
  formula: string;
  knowledgePoint: string;
  atoms: Atom[];
  bonds: Bond[];
  annotations?: Array<Record<string, unknown>>;
}

const MOLECULES: Record<string, MoleculeDefinition> = {
  methane: {
    title: '甲烷分子的正四面体结构',
    formula: 'CH4',
    knowledgePoint: 'sp3 杂化、正四面体构型、H-C-H 键角约 109.5°',
    atoms: [
      { element: 'C', position: [0, 0, 0], label: 'C' },
      { element: 'H', position: [1, 1, 1], label: 'H' },
      { element: 'H', position: [-1, -1, 1], label: 'H' },
      { element: 'H', position: [-1, 1, -1], label: 'H' },
      { element: 'H', position: [1, -1, -1], label: 'H' },
    ],
    bonds: [
      { from: 0, to: 1, type: 'single' },
      { from: 0, to: 2, type: 'single' },
      { from: 0, to: 3, type: 'single' },
      { from: 0, to: 4, type: 'single' },
    ],
    annotations: [{ type: 'angle', label: '109.5°', position: [0.35, 0.62, 0.2] }],
  },
  ethane: {
    title: '乙烷分子的 C-C 单键与双四面体构型',
    formula: 'C2H6',
    knowledgePoint: '两个 sp3 杂化碳原子通过 C-C 单键连接，围绕单键可发生构象旋转',
    atoms: [
      { element: 'C', position: [-0.75, 0, 0], label: 'C1' },
      { element: 'C', position: [0.75, 0, 0], label: 'C2' },
      { element: 'H', position: [-1.25, 0.98, 0], label: 'H' },
      { element: 'H', position: [-1.25, -0.5, 0.86], label: 'H' },
      { element: 'H', position: [-1.25, -0.5, -0.86], label: 'H' },
      { element: 'H', position: [1.25, 0.98, 0], label: 'H' },
      { element: 'H', position: [1.25, -0.5, 0.86], label: 'H' },
      { element: 'H', position: [1.25, -0.5, -0.86], label: 'H' },
    ],
    bonds: [
      { from: 0, to: 1, type: 'single' },
      { from: 0, to: 2, type: 'single' },
      { from: 0, to: 3, type: 'single' },
      { from: 0, to: 4, type: 'single' },
      { from: 1, to: 5, type: 'single' },
      { from: 1, to: 6, type: 'single' },
      { from: 1, to: 7, type: 'single' },
    ],
    annotations: [
      { type: 'bond', label: 'C-C σ 单键', position: [0, 0.38, 0] },
      { type: 'angle', label: '约 109.5°', position: [-0.95, 0.6, 0.25] },
    ],
  },
  ethanol: {
    title: '乙醇分子的羟基与碳链',
    formula: 'C2H6O',
    knowledgePoint: '羟基、C-C 单键、C-O 单键与分子极性',
    atoms: [
      { element: 'C', position: [-1.2, 0, 0], label: 'C1' },
      { element: 'C', position: [0.25, 0, 0], label: 'C2' },
      { element: 'O', position: [1.45, 0.35, 0], label: 'O' },
      { element: 'H', position: [2.1, -0.25, 0], label: 'H' },
      { element: 'H', position: [-1.75, 0.95, 0], label: 'H' },
      { element: 'H', position: [-1.75, -0.48, 0.82], label: 'H' },
      { element: 'H', position: [-1.75, -0.48, -0.82], label: 'H' },
      { element: 'H', position: [0.35, -0.95, 0.58], label: 'H' },
      { element: 'H', position: [0.35, 0.95, -0.58], label: 'H' },
    ],
    bonds: [
      { from: 0, to: 1, type: 'single' },
      { from: 1, to: 2, type: 'single' },
      { from: 2, to: 3, type: 'single' },
      { from: 0, to: 4, type: 'single' },
      { from: 0, to: 5, type: 'single' },
      { from: 0, to: 6, type: 'single' },
      { from: 1, to: 7, type: 'single' },
      { from: 1, to: 8, type: 'single' },
    ],
    annotations: [{ type: 'group', label: '羟基 -OH', position: [1.6, 0.7, 0] }],
  },
  benzene: {
    title: '苯环的平面正六边形结构',
    formula: 'C6H6',
    knowledgePoint: 'sp2 杂化、离域 π 键、平面环状结构',
    atoms: [],
    bonds: [],
  },
  water: {
    title: '水分子的 V 形结构',
    formula: 'H2O',
    knowledgePoint: '孤电子对排斥、H-O-H 键角约 104.5°',
    atoms: [
      { element: 'O', position: [0, 0, 0], label: 'O' },
      { element: 'H', position: [0.95, 0.62, 0], label: 'H' },
      { element: 'H', position: [-0.95, 0.62, 0], label: 'H' },
    ],
    bonds: [
      { from: 0, to: 1, type: 'single' },
      { from: 0, to: 2, type: 'single' },
    ],
    annotations: [{ type: 'angle', label: '104.5°', position: [0, 0.38, 0] }],
  },
  hydrogen: {
    title: '氢气分子的 H-H 单键结构',
    formula: 'H2',
    knowledgePoint: '两个氢原子共享一对电子形成 H-H σ 单键',
    atoms: [
      { element: 'H', position: [-0.38, 0, 0], label: 'H' },
      { element: 'H', position: [0.38, 0, 0], label: 'H' },
    ],
    bonds: [{ from: 0, to: 1, type: 'single' }],
    annotations: [{ type: 'bond', label: 'H-H σ 键', position: [0, 0.35, 0] }],
  },
  carbonDioxide: {
    title: '二氧化碳的线形结构',
    formula: 'CO2',
    knowledgePoint: 'O=C=O 线形结构、双键、键角 180°',
    atoms: [
      { element: 'O', position: [-1.45, 0, 0], label: 'O' },
      { element: 'C', position: [0, 0, 0], label: 'C' },
      { element: 'O', position: [1.45, 0, 0], label: 'O' },
    ],
    bonds: [
      { from: 0, to: 1, type: 'double' },
      { from: 1, to: 2, type: 'double' },
    ],
    annotations: [{ type: 'angle', label: '180°', position: [0, 0.46, 0] }],
  },
  ammonia: {
    title: '氨分子的三角锥结构',
    formula: 'NH3',
    knowledgePoint: 'sp3 杂化、孤电子对、三角锥构型',
    atoms: [
      { element: 'N', position: [0, 0.28, 0], label: 'N' },
      { element: 'H', position: [0.95, -0.45, 0.35], label: 'H' },
      { element: 'H', position: [-0.95, -0.45, 0.35], label: 'H' },
      { element: 'H', position: [0, -0.45, -0.95], label: 'H' },
    ],
    bonds: [
      { from: 0, to: 1, type: 'single' },
      { from: 0, to: 2, type: 'single' },
      { from: 0, to: 3, type: 'single' },
    ],
    annotations: [{ type: 'group', label: '孤电子对', position: [0, 1.1, 0] }],
  },
  aceticAcid: {
    title: '乙酸分子的羧基与甲基结构',
    formula: 'CH3COOH',
    knowledgePoint: '羧基 -COOH、甲基 -CH3、C=O 双键、O-H 极性键',
    atoms: [
      { element: 'C', position: [-1.05, 0, 0], label: 'CH3' },
      { element: 'C', position: [0.2, 0, 0], label: 'C' },
      { element: 'O', position: [1.02, 0.78, 0], label: 'O' },
      { element: 'O', position: [0.92, -0.82, 0], label: 'O' },
      { element: 'H', position: [1.78, -0.6, 0], label: 'H' },
      { element: 'H', position: [-1.65, 0.9, 0], label: 'H' },
      { element: 'H', position: [-1.65, -0.45, 0.78], label: 'H' },
      { element: 'H', position: [-1.65, -0.45, -0.78], label: 'H' },
    ],
    bonds: [
      { from: 0, to: 1, type: 'single' },
      { from: 1, to: 2, type: 'double' },
      { from: 1, to: 3, type: 'single' },
      { from: 3, to: 4, type: 'single' },
      { from: 0, to: 5, type: 'single' },
      { from: 0, to: 6, type: 'single' },
      { from: 0, to: 7, type: 'single' },
    ],
    annotations: [
      { type: 'group', label: '羧基 -COOH', position: [0.88, -1.35, 0] },
      { type: 'group', label: '甲基 -CH3', position: [-1.55, 1.28, 0] },
      { type: 'bond', label: 'C=O 双键', position: [0.75, 0.48, 0] },
    ],
  },
};

function buildBenzene(): MoleculeDefinition {
  const atoms: Atom[] = [];
  const bonds: Bond[] = [];
  const radius = 1.35;
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI * 2 * i) / 6;
    atoms.push({ element: 'C', position: [Math.cos(a) * radius, Math.sin(a) * radius, 0], label: 'C' });
  }
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI * 2 * i) / 6;
    atoms.push({ element: 'H', position: [Math.cos(a) * 2.25, Math.sin(a) * 2.25, 0], label: 'H' });
  }
  for (let i = 0; i < 6; i += 1) {
    bonds.push({ from: i, to: (i + 1) % 6, type: i % 2 === 0 ? 'double' : 'single' });
    bonds.push({ from: i, to: i + 6, type: 'single' });
  }
  return {
    ...MOLECULES.benzene,
    atoms,
    bonds,
    annotations: [{ type: 'group', label: '离域 π 键', position: [0, 0, 0.25] }],
  };
}

function containsAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function detectMolecule(text: string): string {
  if (containsAny(text, ['乙酸', '醋酸', 'acetic acid', 'ch3cooh'])) return 'aceticAcid';
  if (containsAny(text, ['甲烷', 'methane', 'ch4'])) return 'methane';
  if (containsAny(text, ['乙醇', '酒精', 'ethanol', 'c2h6o'])) return 'ethanol';
  if (containsAny(text, ['乙烷', 'ethane', 'c2h6'])) return 'ethane';
  if (containsAny(text, ['苯', 'benzene', 'c6h6'])) return 'benzene';
  if (containsAny(text, ['二氧化碳', 'co2', 'carbon dioxide'])) return 'carbonDioxide';
  if (containsAny(text, ['氨', '氨气', 'nh3', 'ammonia'])) return 'ammonia';
  if (containsAny(text, ['水分子', '水的', 'h2o', 'water'])) return 'water';
  if (containsAny(text, ['氢气', '氢分子', 'h2', 'hydrogen'])) return 'hydrogen';
  return 'methane';
}

function isSaponification(text: string): boolean {
  const normalized = text.toLowerCase();
  return containsAny(normalized, [
    '皂化',
    'saponification',
    '酯水解',
    '碱性水解',
    '油脂水解',
    '酯在碱性',
    '肥皂',
  ]);
}

function isNitration(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasBenzene = containsAny(normalized, ['苯', 'benzene', 'c6h6']);
  const hasNitricAcid = containsAny(normalized, ['浓硝酸', '硝酸', 'nitric acid', 'hno3']);
  return containsAny(normalized, ['硝化', 'nitration', '硝基苯', 'nitrobenzene'])
    || (hasBenzene && hasNitricAcid);
}

function isBenzeneHydrogenation(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasBenzene = containsAny(normalized, ['苯', 'benzene', 'c6h6']);
  const hasHydrogen = containsAny(normalized, ['氢气', 'h2', 'hydrogen']);
  const hasReaction = containsAny(normalized, ['反应', '加氢', '氢化', '催化氢化', 'reaction', 'hydrogenation']);
  return hasBenzene && hasHydrogen && hasReaction;
}

function isGenericReaction(text: string): boolean {
  const normalized = text.toLowerCase();
  return containsAny(normalized, [
    '化学反应',
    '反应过程',
    '反应',
    '燃烧',
    '生成水',
    '水解',
    '酯化',
    '取代',
    '加成',
    '加氢',
    '氢化',
    '消去',
    '氧化',
    '还原',
    '中和',
    'reaction',
    'combustion',
    'hydrolysis',
    'substitution',
    'addition',
    'hydrogenation',
  ]);
}

function isKnownReaction(text: string): boolean {
  return isSaponification(text) || isNitration(text) || isBenzeneHydrogenation(text);
}

function reactionNameForInput(text: string): string {
  if (isSaponification(text)) return '皂化反应过程';
  if (isNitration(text)) return '苯的硝化反应过程';
  if (isBenzeneHydrogenation(text)) return '苯的催化加氢反应过程';
  return '化学反应过程';
}

function reactionKnowledgeForInput(text: string): string {
  if (isSaponification(text)) return '酯在碱性条件下水解生成羧酸盐和醇的过程';
  if (isNitration(text)) return '苯环发生亲电取代，引入硝基生成硝基苯的过程';
  if (isBenzeneHydrogenation(text)) return '苯环在催化剂作用下与氢气加成生成环己烷的过程';
  return '反应物、生成物、化学键重组和反应过程动画';
}

export function parseChemRequest(rawInput: string, attachments: AttachmentInput[] = []): ParsedChemRequest {
  const attachmentText = attachments
    .map((item) => [item.fileName, item.caption, item.summary, item.extractedText]
      .filter(Boolean)
      .join(' '))
    .join(' ');
  const normalizedInput = `${rawInput} ${attachmentText}`.toLowerCase();
  const cnInput = `${rawInput} ${attachmentText}`;

  let templateId: SceneTemplateId = 'molecule-3d';
  if (isKnownReaction(cnInput)) {
    templateId = 'reaction-3d';
  } else if (containsAny(normalizedInput, ['晶体', '晶胞', '氯化钠', 'nacl', 'crystal'])) {
    templateId = 'crystal-3d';
  } else if (containsAny(normalizedInput, ['轨道', '杂化轨道', '电子云', 'orbital', 'sp3', 'sp2'])) {
    templateId = 'orbital-3d';
  } else if (containsAny(normalizedInput, ['精馏', '蒸馏塔', '反应釜', '化工设备', 'equipment', 'tower'])) {
    templateId = 'equipment-3d';
  } else if (containsAny(normalizedInput, ['实验装置', '制取氧气', '烧瓶', '导管', '集气瓶', 'apparatus'])) {
    templateId = 'apparatus-3d';
  } else if (isGenericReaction(cnInput)) {
    templateId = 'reaction-3d';
  }

  const moleculeKey = detectMolecule(normalizedInput);
  const molecule = moleculeKey === 'benzene' ? buildBenzene() : MOLECULES[moleculeKey];
  const templateName: Record<SceneTemplateId, string> = {
    'molecule-3d': molecule.title,
    'reaction-3d': reactionNameForInput(cnInput),
    'crystal-3d': '氯化钠晶体结构',
    'orbital-3d': containsAny(normalizedInput, ['sp2']) ? 'sp2 杂化轨道' : 'sp3 杂化轨道',
    'equipment-3d': '精馏塔结构与物流方向',
    'apparatus-3d': '实验室制取氧气装置',
  };
  const knowledgePoint: Record<SceneTemplateId, string> = {
    'molecule-3d': molecule.knowledgePoint,
    'reaction-3d': reactionKnowledgeForInput(cnInput),
    'crystal-3d': '离子晶体、晶胞、配位关系和空间周期性',
    'orbital-3d': '杂化轨道方向、空间构型和成键取向',
    'equipment-3d': '化工设备结构、内部构件和物料流向',
    'apparatus-3d': '实验发生装置、收集装置和气体流动路径',
  };

  return {
    rawInput,
    normalizedInput,
    templateId,
    modelingObject: templateName[templateId],
    knowledgePoint: knowledgePoint[templateId],
    teachingGoal: `帮助学生理解${templateName[templateId]}中的${knowledgePoint[templateId]}`,
    moleculeKey,
    confidence: attachments.length > 0 ? 0.82 : 0.88,
    attachmentSummary: attachmentText || '无附件',
  };
}

export function createClarifyCard(parsed: ParsedChemRequest): ClarifyCard {
  const templateQuestion: ClarifyQuestion = {
    id: 'template_id',
    label: '场景模板',
    type: 'single_select',
    required: false,
    defaultValue: parsed.templateId,
    options: [
      { label: '单分子结构', value: 'molecule-3d' },
      { label: '反应过程', value: 'reaction-3d' },
      { label: '晶体结构', value: 'crystal-3d' },
      { label: '电子轨道', value: 'orbital-3d' },
      { label: '化工设备', value: 'equipment-3d' },
      { label: '实验装置', value: 'apparatus-3d' },
    ],
  };
  const questions: ClarifyQuestion[] = [
    templateQuestion,
    {
      id: 'display_mode',
      label: '结构展示模式',
      type: 'single_select',
      required: false,
      defaultValue: parsed.templateId === 'molecule-3d' ? 'ball_stick' : 'mixed',
      options: [
        { label: '球棍模型', value: 'ball_stick' },
        { label: '空间填充', value: 'space_filling' },
        { label: '混合显示', value: 'mixed' },
      ],
    },
    {
      id: 'annotations',
      label: '教学标注',
      type: 'multi_select',
      required: false,
      defaultValue: ['atom_label', 'bond_angle', 'key_note'],
      options: [
        { label: '原子/部件标签', value: 'atom_label' },
        { label: '键角/尺寸标注', value: 'bond_angle' },
        { label: '关键知识提示', value: 'key_note' },
        { label: '动画控制', value: 'animate' },
      ],
    },
  ];

  const defaults = Object.fromEntries(questions.map((q) => [q.id, q.defaultValue]));
  return {
    title: '确认教学展示细节',
    reason: `已识别为“${parsed.modelingObject}”。以下选项都有默认值，可以直接生成，也可以按课堂讲解重点调整。`,
    questions,
    actions: {
      primary: '使用以上选项生成',
      secondary: '直接生成',
    },
    defaults,
  };
}

function stringSelection(
  selections: Record<string, unknown> | undefined,
  key: string,
  fallback: string,
): string {
  const value = selections?.[key];
  return typeof value === 'string' && value ? value : fallback;
}

function arraySelection(
  selections: Record<string, unknown> | undefined,
  key: string,
  fallback: string[],
): string[] {
  const value = selections?.[key];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value === 'string' && value) return [value];
  return fallback;
}

function buildSaponificationChemistry(): Record<string, unknown> {
  const ester = {
    label: '酯 R-COOR′',
    formula: 'RCOOR′',
    atoms: [
      { element: 'C', position: [-0.9, 0, 0], label: 'R' },
      { element: 'C', position: [0, 0, 0], label: 'C=O' },
      { element: 'O', position: [0.82, 0.68, 0], label: 'O' },
      { element: 'O', position: [0.82, -0.68, 0], label: 'O' },
      { element: 'C', position: [1.62, -1.18, 0], label: 'R′' },
    ],
    bonds: [
      { from: 0, to: 1, type: 'single' },
      { from: 1, to: 2, type: 'double' },
      { from: 1, to: 3, type: 'single' },
      { from: 3, to: 4, type: 'single' },
    ],
    annotations: [
      { type: 'bond', label: '酯键', position: [0.95, -0.92, 0] },
      { type: 'bond', label: 'C=O', position: [0.4, 0.58, 0] },
    ],
  };

  const hydroxide = {
    label: 'OH-',
    formula: 'OH-',
    atoms: [
      { element: 'O', position: [0, 0, 0], label: 'O-' },
      { element: 'H', position: [0.7, 0.36, 0], label: 'H' },
    ],
    bonds: [{ from: 0, to: 1, type: 'single' }],
    annotations: [{ type: 'note', label: '亲核进攻', position: [0.2, 0.9, 0] }],
  };

  const carboxylate = {
    label: '羧酸盐 R-COO-',
    formula: 'RCOO-',
    atoms: [
      { element: 'C', position: [-0.8, 0, 0], label: 'R' },
      { element: 'C', position: [0, 0, 0], label: 'C' },
      { element: 'O', position: [0.82, 0.58, 0], label: 'O-' },
      { element: 'O', position: [0.82, -0.58, 0], label: 'O' },
    ],
    bonds: [
      { from: 0, to: 1, type: 'single' },
      { from: 1, to: 2, type: 'single' },
      { from: 1, to: 3, type: 'double' },
    ],
    annotations: [{ type: 'note', label: '羧酸盐生成', position: [0.35, -1, 0] }],
  };

  const alcohol = {
    label: '醇 R′OH',
    formula: 'R′OH',
    atoms: [
      { element: 'C', position: [-0.45, 0, 0], label: 'R′' },
      { element: 'O', position: [0.55, 0, 0], label: 'O' },
      { element: 'H', position: [1.2, 0.42, 0], label: 'H' },
    ],
    bonds: [
      { from: 0, to: 1, type: 'single' },
      { from: 1, to: 2, type: 'single' },
    ],
    annotations: [{ type: 'note', label: '醇生成', position: [0.55, 0.82, 0] }],
  };

  return {
    equation: 'RCOOR′ + OH- -> RCOO- + R′OH',
    steps: ['OH- 靠近羰基碳', '酯键断裂', '生成羧酸盐和醇'],
    reactants: [ester, hydroxide],
    products: [carboxylate, alcohol],
    focus: ['酯键断裂', '羧酸盐生成', '醇生成'],
  };
}

function buildNitricAcidMolecule(): Record<string, unknown> {
  return {
    label: '浓硝酸 HNO3',
    formula: 'HNO3',
    atoms: [
      { element: 'N', position: [0, 0, 0], label: 'N' },
      { element: 'O', position: [0.95, 0, 0], label: 'O' },
      { element: 'O', position: [-0.52, 0.82, 0], label: 'O' },
      { element: 'O', position: [-0.52, -0.82, 0], label: 'O' },
      { element: 'H', position: [-1.18, -1.2, 0], label: 'H' },
    ],
    bonds: [
      { from: 0, to: 1, type: 'double' },
      { from: 0, to: 2, type: 'double' },
      { from: 0, to: 3, type: 'single' },
      { from: 3, to: 4, type: 'single' },
    ],
    annotations: [
      { type: 'note', label: '浓硝酸提供硝化试剂', position: [0, 1.25, 0] },
      { type: 'note', label: 'H2SO4 促进 NO2+ 形成', position: [0, -1.35, 0] },
    ],
  };
}

function buildNitrobenzeneMolecule(): Record<string, unknown> {
  const atoms: Atom[] = [];
  const bonds: Bond[] = [];
  const radius = 1.35;

  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI * 2 * i) / 6;
    atoms.push({ element: 'C', position: [Math.cos(a) * radius, Math.sin(a) * radius, 0], label: 'C' });
  }

  for (let i = 1; i < 6; i += 1) {
    const a = (Math.PI * 2 * i) / 6;
    atoms.push({ element: 'H', position: [Math.cos(a) * 2.25, Math.sin(a) * 2.25, 0], label: 'H' });
  }

  const nitroN = atoms.length;
  atoms.push({ element: 'N', position: [2.25, 0, 0], label: 'N' });
  const nitroO1 = atoms.length;
  atoms.push({ element: 'O', position: [3.02, 0.5, 0], label: 'O' });
  const nitroO2 = atoms.length;
  atoms.push({ element: 'O', position: [3.02, -0.5, 0], label: 'O' });

  for (let i = 0; i < 6; i += 1) {
    bonds.push({ from: i, to: (i + 1) % 6, type: i % 2 === 0 ? 'double' : 'single' });
  }
  for (let i = 1; i < 6; i += 1) {
    bonds.push({ from: i, to: 5 + i, type: 'single' });
  }
  bonds.push({ from: 0, to: nitroN, type: 'single' });
  bonds.push({ from: nitroN, to: nitroO1, type: 'double' });
  bonds.push({ from: nitroN, to: nitroO2, type: 'single' });

  return {
    label: '硝基苯 C6H5NO2',
    formula: 'C6H5NO2',
    atoms,
    bonds,
    annotations: [
      { type: 'group', label: '硝基 -NO2', position: [2.85, 0, 0] },
      { type: 'note', label: '芳香性恢复', position: [0, 0, 0.3] },
    ],
  };
}

function buildBenzeneNitrationChemistry(): Record<string, unknown> {
  const benzene = buildBenzene();
  const water = MOLECULES.water;

  return {
    equation: 'C6H6 + HNO3 -> C6H5NO2 + H2O',
    conditions: ['浓硝酸', '浓硫酸催化', '约 50-60 °C'],
    steps: ['HNO3/H2SO4 生成 NO2+', '苯环 π 电子进攻 NO2+', '脱去 H+ 后恢复芳香性，生成硝基苯'],
    reactants: [
      {
        label: '苯 C6H6',
        formula: benzene.formula,
        atoms: benzene.atoms,
        bonds: benzene.bonds,
        annotations: [
          { type: 'group', label: '苯环 π 电子云', position: [0, 0, 0.28] },
        ],
      },
      buildNitricAcidMolecule(),
    ],
    products: [
      buildNitrobenzeneMolecule(),
      {
        label: '水 H2O',
        formula: water.formula,
        atoms: water.atoms,
        bonds: water.bonds,
        annotations: water.annotations ?? [],
      },
    ],
    focus: ['亲电芳香取代', '硝鎓离子 NO2+', '硝基取代苯环上的 H'],
  };
}

function buildHydrogenMolecule(label = '氢气 H2'): Record<string, unknown> {
  const hydrogen = MOLECULES.hydrogen;
  return {
    label,
    formula: hydrogen.formula,
    atoms: hydrogen.atoms,
    bonds: hydrogen.bonds,
    annotations: hydrogen.annotations ?? [],
  };
}

function buildCyclohexaneMolecule(): Record<string, unknown> {
  const atoms: Atom[] = [];
  const bonds: Bond[] = [];
  const ring: Array<[number, number, number]> = [
    [1.35, 0, 0.45],
    [0.68, 1.18, -0.45],
    [-0.68, 1.18, 0.45],
    [-1.35, 0, -0.45],
    [-0.68, -1.18, 0.45],
    [0.68, -1.18, -0.45],
  ];

  ring.forEach((position, index) => {
    atoms.push({ element: 'C', position, label: `C${index + 1}` });
  });

  ring.forEach(([x, y, z], index) => {
    const radialLength = Math.max(0.001, Math.hypot(x, y));
    const radialX = x / radialLength;
    const radialY = y / radialLength;
    atoms.push({ element: 'H', position: [x + radialX * 0.82, y + radialY * 0.82, z], label: 'H' });
    atoms.push({ element: 'H', position: [x, y, z > 0 ? z + 0.86 : z - 0.86], label: 'H' });
    bonds.push({ from: index, to: 6 + index * 2, type: 'single' });
    bonds.push({ from: index, to: 7 + index * 2, type: 'single' });
  });

  for (let i = 0; i < 6; i += 1) {
    bonds.push({ from: i, to: (i + 1) % 6, type: 'single' });
  }

  return {
    label: '环己烷 C6H12',
    formula: 'C6H12',
    atoms,
    bonds,
    annotations: [
      { type: 'group', label: '饱和六元环', position: [0, 0, 0.95] },
      { type: 'note', label: '苯环加氢后失去芳香性', position: [0, -1.75, 0] },
    ],
  };
}

function buildBenzeneHydrogenationChemistry(): Record<string, unknown> {
  const benzene = buildBenzene();

  return {
    equation: 'C6H6 + 3H2 -> C6H12',
    conditions: ['Ni/Pt/Pd 催化剂', '加热加压', '催化加氢'],
    steps: ['H2 在金属催化剂表面吸附并活化', '苯环 π 键逐步加氢', '形成饱和六元环环己烷'],
    reactants: [
      {
        label: '苯 C6H6',
        formula: benzene.formula,
        atoms: benzene.atoms,
        bonds: benzene.bonds,
        annotations: [
          { type: 'group', label: '芳香 π 体系', position: [0, 0, 0.28] },
        ],
      },
      buildHydrogenMolecule('3 H2'),
    ],
    products: [
      buildCyclohexaneMolecule(),
    ],
    focus: ['催化加氢', 'π 键转化为 C-C 单键', '环己烷生成'],
  };
}

export function buildSceneSpec(
  parsed: ParsedChemRequest,
  selections: Record<string, unknown> | undefined = {},
): SceneSpec {
  const sceneId = `scene_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const templateId = stringSelection(selections, 'template_id', parsed.templateId) as SceneTemplateId;
  const displayMode = stringSelection(selections, 'display_mode', templateId === 'molecule-3d' ? 'ball_stick' : 'mixed') as SceneSpec['visualStyle']['displayMode'];
  const annotations = arraySelection(selections, 'annotations', ['atom_label', 'bond_angle', 'key_note']);
  const interactions = Array.from(new Set(['rotate', 'zoom', ...annotations]));

  const base: SceneSpec = {
    sceneId,
    templateId,
    title: parsed.modelingObject,
    teachingGoal: parsed.teachingGoal,
    language: 'zh',
    visualStyle: {
      colorScheme: 'cpk',
      background: 'dark',
      displayMode,
    },
    interactions,
    chemistry: {},
  };

  if (templateId === 'molecule-3d') {
    const molecule = parsed.moleculeKey === 'benzene' ? buildBenzene() : MOLECULES[parsed.moleculeKey ?? 'methane'];
    return {
      ...base,
      title: molecule.title,
      teachingGoal: `展示 ${molecule.formula} 的空间结构，突出${molecule.knowledgePoint}`,
      chemistry: {
        formula: molecule.formula,
        atoms: molecule.atoms,
        bonds: molecule.bonds,
        annotations: molecule.annotations ?? [],
      },
    };
  }

  if (templateId === 'reaction-3d') {
    if (isNitration(parsed.rawInput) || isNitration(parsed.normalizedInput)) {
      return {
        ...base,
        title: '苯的硝化反应',
        teachingGoal: '展示苯与浓硝酸在浓硫酸催化下发生亲电芳香取代，理解 NO2+ 生成、苯环进攻和硝基苯生成过程。',
        chemistry: buildBenzeneNitrationChemistry(),
      };
    }

    if (isBenzeneHydrogenation(parsed.rawInput) || isBenzeneHydrogenation(parsed.normalizedInput)) {
      return {
        ...base,
        title: '苯的催化加氢反应',
        teachingGoal: '展示苯与氢气在金属催化剂作用下加成生成环己烷，理解芳香 π 体系被逐步加氢为饱和六元环的过程。',
        chemistry: buildBenzeneHydrogenationChemistry(),
      };
    }

    if (isSaponification(parsed.rawInput) || isSaponification(parsed.normalizedInput)) {
      return {
        ...base,
        title: '皂化反应',
        teachingGoal: '展示酯在碱性条件下水解，理解酯键断裂、OH- 进攻以及羧酸盐和醇的生成。',
        chemistry: buildSaponificationChemistry(),
      };
    }

    return {
      ...base,
      title: parsed.modelingObject,
      teachingGoal: parsed.teachingGoal,
      chemistry: {
        equation: parsed.rawInput,
        steps: ['识别反应物', '展示关键断键/成键位置', '展示生成物与教学标注'],
        reactants: [],
        products: [],
      },
    };
  }

  if (templateId === 'crystal-3d') {
    return {
      ...base,
      title: '氯化钠晶体的离子晶格',
      teachingGoal: '展示 Na+ 与 Cl- 在晶胞中的交替排列，理解离子晶体的空间周期性。',
      chemistry: {
        lattice: 'rock_salt',
        repeat: 3,
        ions: ['Na+', 'Cl-'],
      },
    };
  }

  if (templateId === 'orbital-3d') {
    const isSp2 = parsed.normalizedInput.includes('sp2');
    return {
      ...base,
      title: isSp2 ? 'sp2 杂化轨道的平面三角构型' : 'sp3 杂化轨道的正四面体取向',
      teachingGoal: isSp2
        ? '展示三个 sp2 杂化轨道在同一平面内约 120° 分布。'
        : '展示四个 sp3 杂化轨道指向正四面体四个顶点。',
      chemistry: {
        orbitalType: isSp2 ? 'sp2' : 'sp3',
        angle: isSp2 ? '120°' : '109.5°',
      },
    };
  }

  if (templateId === 'equipment-3d') {
    return {
      ...base,
      title: '精馏塔结构与物流方向',
      teachingGoal: '展示塔体、塔板、进料、回流和塔顶/塔底产物的相对位置。',
      chemistry: {
        equipment: 'distillation_column',
        parts: ['塔体', '塔板', '进料口', '回流', '塔顶产品', '塔底产品'],
      },
    };
  }

  return {
    ...base,
    title: '实验室制取氧气装置',
    teachingGoal: '展示发生装置、导管、集气瓶和气体流动路径，辅助讲解实验搭建逻辑。',
    chemistry: {
      apparatus: 'oxygen_collection',
      parts: ['试管/烧瓶', '酒精灯', '导管', '水槽', '集气瓶'],
    },
  };
}

function escapeScriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/<\/script/gi, '<\\/script');
}

export function renderThreeJsHtml(spec: SceneSpec): string {
  const specJson = escapeScriptJson(spec);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(spec.title)}</title>
  <style>
    :root {
      color-scheme: dark;
      --panel: rgba(13, 22, 24, 0.82);
      --line: rgba(127, 207, 190, 0.28);
      --text: #f2fbf8;
      --muted: #9db7b2;
      --cyan: #61d9c6;
      --amber: #f2b84b;
      --magenta: #dc5a82;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      overflow: hidden;
      min-height: 100vh;
      font-family: Inter, "Segoe UI", Arial, sans-serif;
      color: var(--text);
      background:
        linear-gradient(90deg, rgba(97,217,198,0.06) 1px, transparent 1px),
        linear-gradient(0deg, rgba(97,217,198,0.05) 1px, transparent 1px),
        radial-gradient(circle at 24% 20%, rgba(220,90,130,0.18), transparent 34%),
        linear-gradient(135deg, #071012 0%, #132022 52%, #07100f 100%);
      background-size: 42px 42px, 42px 42px, auto, auto;
    }
    #app { position: fixed; inset: 0; }
    .hud {
      position: fixed;
      left: 18px;
      top: 18px;
      width: min(360px, calc(100vw - 36px));
      padding: 14px 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      backdrop-filter: blur(16px);
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.32);
    }
    .kicker {
      margin: 0 0 8px;
      color: var(--cyan);
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      font-size: clamp(20px, 4vw, 34px);
      line-height: 1.1;
      letter-spacing: 0;
    }
    .goal {
      margin: 10px 0 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.55;
    }
    .controls {
      position: fixed;
      left: 18px;
      bottom: 18px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      max-width: calc(100vw - 36px);
    }
    button {
      min-height: 34px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(8, 16, 17, 0.8);
      color: var(--text);
      padding: 8px 11px;
      font: 600 12px/1 Inter, "Segoe UI", Arial, sans-serif;
      cursor: pointer;
    }
    button:hover { border-color: var(--cyan); color: var(--cyan); }
    .legend {
      position: fixed;
      right: 18px;
      top: 18px;
      width: min(260px, calc(100vw - 36px));
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }
    .loading {
      position: fixed;
      inset: 0;
      display: grid;
      place-items: center;
      color: var(--cyan);
      background: #071012;
      z-index: 5;
    }
    .hidden { display: none; }
    @media (max-width: 760px) {
      .legend { display: none; }
      .hud { top: 12px; left: 12px; width: calc(100vw - 24px); }
      .controls { left: 12px; bottom: 12px; }
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <div id="loading" class="loading">正在装配 3D 教学场景...</div>
  <section class="hud">
    <p class="kicker">${escapeHtml(spec.templateId)}</p>
    <h1>${escapeHtml(spec.title)}</h1>
    <p class="goal">${escapeHtml(spec.teachingGoal)}</p>
  </section>
  <aside class="legend" id="legend">拖动旋转，滚轮缩放。按钮可切换标注、动画和模型辅助层。</aside>
  <div class="controls">
    <button id="toggleLabels" type="button">标签</button>
    <button id="toggleAnimation" type="button">动画</button>
    <button id="resetCamera" type="button">复位视角</button>
  </div>
  <script type="importmap">
    {
      "imports": {
        "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
        "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
      }
    }
  </script>
  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

    const SPEC = ${specJson};
    const root = document.getElementById('app');
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x071012, 10, 38);
    const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(5.8, 4.6, 6.8);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    root.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    scene.add(new THREE.AmbientLight(0xdffcf5, 0.82));
    const key = new THREE.DirectionalLight(0xffffff, 1.45);
    key.position.set(4, 6, 5);
    scene.add(key);
    const rim = new THREE.PointLight(0x61d9c6, 2.3, 18);
    rim.position.set(-5, 3, -4);
    scene.add(rim);

    const labels = new THREE.Group();
    const animated = new THREE.Group();
    const staticGroup = new THREE.Group();
    scene.add(staticGroup, animated, labels);
    let labelsVisible = true;
    let animationEnabled = true;

    const atomColors = {
      H: 0xf4f7fb, C: 0x30323a, O: 0xe84f5f, N: 0x5278ff,
      Na: 0x6e8cff, Cl: 0x76d66f, S: 0xf2c94c
    };
    const atomRadii = { H: 0.24, C: 0.38, O: 0.34, N: 0.35, Na: 0.38, Cl: 0.46, S: 0.42 };

    function material(color, roughness = 0.45, metalness = 0.04, opacity = 1) {
      return new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        transparent: opacity < 1,
        opacity
      });
    }

    function textSprite(text, color = '#f2fbf8') {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 160;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(7, 16, 18, 0.72)';
      roundRect(ctx, 18, 28, 476, 96, 18);
      ctx.fill();
      ctx.strokeStyle = 'rgba(97, 217, 198, 0.48)';
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = '600 42px Inter, Segoe UI, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 256, 78);
      const texture = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
      sprite.scale.set(1.7, 0.54, 1);
      return sprite;
    }

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function cylinderBetween(a, b, radius, color, target = staticGroup) {
      const start = new THREE.Vector3(...a);
      const end = new THREE.Vector3(...b);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const dir = end.clone().sub(start);
      const len = dir.length();
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, len, 24),
        material(color, 0.38)
      );
      mesh.position.copy(mid);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      target.add(mesh);
      return mesh;
    }

    function addLabel(text, position, color = '#f2fbf8') {
      const sprite = textSprite(text, color);
      sprite.position.set(position[0], position[1], position[2]);
      labels.add(sprite);
      return sprite;
    }

    function addAtom(atom, target = staticGroup) {
      const element = atom.element;
      const baseRadius = atomRadii[element] ?? 0.34;
      const radius = SPEC.visualStyle.displayMode === 'space_filling' ? baseRadius * 1.55 : baseRadius;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 48, 32),
        material(atomColors[element] ?? 0xb8ccd0, 0.34, 0.08)
      );
      mesh.position.set(...atom.position);
      target.add(mesh);
      if (SPEC.interactions.includes('atom_label')) {
        addLabel(atom.label || element, [atom.position[0], atom.position[1] + radius + 0.42, atom.position[2]]);
      }
      return mesh;
    }

    function addBond(a, b, type = 'single', target = staticGroup) {
      const offsets = type === 'double' ? [-0.07, 0.07] : type === 'triple' ? [-0.11, 0, 0.11] : [0];
      for (const offset of offsets) {
        cylinderBetween([a[0], a[1] + offset, a[2]], [b[0], b[1] + offset, b[2]], 0.075, 0xb7c9cb, target);
      }
    }

    function arrow(from, to, color = 0x61d9c6, target = staticGroup) {
      cylinderBetween(from, to, 0.035, color, target);
      const start = new THREE.Vector3(...from);
      const end = new THREE.Vector3(...to);
      const dir = end.clone().sub(start).normalize();
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 32), material(color, 0.34));
      cone.position.copy(end);
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      target.add(cone);
    }

    function buildMolecule(content, offset = [0, 0, 0], target = staticGroup, scale = 1) {
      const atoms = content.atoms || [];
      const transformed = atoms.map(atom => ({
        ...atom,
        position: [
          atom.position[0] * scale + offset[0],
          atom.position[1] * scale + offset[1],
          atom.position[2] * scale + offset[2],
        ]
      }));
      transformed.forEach(atom => addAtom(atom, target));
      for (const bond of content.bonds || []) {
        if (!transformed[bond.from] || !transformed[bond.to]) continue;
        addBond(transformed[bond.from].position, transformed[bond.to].position, bond.type, target);
      }
      for (const note of content.annotations || []) {
        if (note.label && SPEC.interactions.includes('key_note')) {
          const p = note.position || [0, 1.6, 0];
          addLabel(note.label, [p[0] + offset[0], p[1] + offset[1], p[2] + offset[2]], '#f2b84b');
        }
      }
    }

    function labelOf(content, index) {
      return content.label || content.formula || ('物质 ' + (index + 1));
    }

    function buildReaction() {
      const modelReactants = Array.isArray(SPEC.chemistry.reactants) ? SPEC.chemistry.reactants : [];
      const modelProducts = Array.isArray(SPEC.chemistry.products) ? SPEC.chemistry.products : [];
      if (modelReactants.length > 0 || modelProducts.length > 0) {
        const reactantCount = Math.max(modelReactants.length, 1);
        const productCount = Math.max(modelProducts.length, 1);
        modelReactants.forEach((content, i) => {
          const y = (reactantCount - 1) * 0.72 - i * 1.44;
          buildMolecule(content, [-3.0, y, 0], animated, 0.78);
          addLabel(labelOf(content, i), [-3.0, y + 1.05, 0], '#f2fbf8');
        });
        modelProducts.forEach((content, i) => {
          const y = (productCount - 1) * 0.72 - i * 1.44;
          buildMolecule(content, [3.0, y, 0], staticGroup, 0.78);
          addLabel(labelOf(content, i), [3.0, y + 1.05, 0], '#f2fbf8');
        });
        arrow([-0.9, 0, 0], [0.9, 0, 0], 0xf2b84b, staticGroup);
        addLabel(SPEC.chemistry.equation || 'reaction', [0, 0.76, 0], '#f2b84b');
        const steps = Array.isArray(SPEC.chemistry.steps) ? SPEC.chemistry.steps : [];
        if (steps[0]) addLabel(steps[0], [0, -0.86, 0], '#61d9c6');
        return;
      }
      arrow([-2.2, 0, 0], [2.2, 0, 0], 0xf2b84b, staticGroup);
      addLabel('反应物', [-3.0, 0.35, 0], '#f2fbf8');
      addLabel('生成物', [3.0, 0.35, 0], '#f2fbf8');
      addLabel(SPEC.chemistry.equation || SPEC.title || '化学反应', [0, 0.85, 0], '#f2b84b');
      const steps = Array.isArray(SPEC.chemistry.steps) ? SPEC.chemistry.steps : [];
      steps.slice(0, 3).forEach((step, i) => {
        addLabel(String(step), [0, -0.55 - i * 0.62, 0], i === 0 ? '#61d9c6' : '#f2fbf8');
      });
    }

    function buildCrystal() {
      const repeat = Number(SPEC.chemistry.repeat || 3);
      const spacing = 0.92;
      const start = -((repeat - 1) * spacing) / 2;
      for (let x = 0; x < repeat; x++) {
        for (let y = 0; y < repeat; y++) {
          for (let z = 0; z < repeat; z++) {
            const isNa = (x + y + z) % 2 === 0;
            addAtom({
              element: isNa ? 'Na' : 'Cl',
              position: [start + x * spacing, start + y * spacing, start + z * spacing],
              label: isNa ? 'Na+' : 'Cl-'
            });
          }
        }
      }
      const size = spacing * (repeat - 1);
      const box = new THREE.Box3(new THREE.Vector3(start, start, start), new THREE.Vector3(start + size, start + size, start + size));
      const helper = new THREE.Box3Helper(box, 0x61d9c6);
      staticGroup.add(helper);
      addLabel('Na+ / Cl- 交替排列', [0, 2.05, 0], '#f2b84b');
    }

    function buildOrbital() {
      const type = SPEC.chemistry.orbitalType || 'sp3';
      const dirs = type === 'sp2'
        ? [[1,0,0], [-0.5,0.866,0], [-0.5,-0.866,0]]
        : [[1,1,1], [-1,-1,1], [-1,1,-1], [1,-1,-1]];
      staticGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 20), material(0xf2b84b)));
      dirs.forEach((raw, i) => {
        const dir = new THREE.Vector3(...raw).normalize();
        const lobe = new THREE.Mesh(
          new THREE.SphereGeometry(0.48, 48, 32),
          material(i % 2 === 0 ? 0x61d9c6 : 0xdc5a82, 0.28, 0.02, 0.62)
        );
        lobe.position.copy(dir.clone().multiplyScalar(1.08));
        lobe.scale.set(0.78, 0.78, 1.55);
        lobe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        staticGroup.add(lobe);
        const small = lobe.clone();
        small.position.copy(dir.clone().multiplyScalar(-0.42));
        small.scale.set(0.28, 0.28, 0.52);
        staticGroup.add(small);
      });
      addLabel(type.toUpperCase() + ' · ' + (SPEC.chemistry.angle || ''), [0, 1.9, 0], '#f2b84b');
    }

    function buildEquipment() {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 4.8, 48), material(0x8eb7bd, 0.3, 0.18, 0.58));
      tower.position.set(0, 0, 0);
      staticGroup.add(tower);
      for (let i = -4; i <= 4; i += 1) {
        const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.025, 48), material(0x61d9c6, 0.35, 0.08, 0.72));
        tray.position.y = i * 0.45;
        staticGroup.add(tray);
      }
      cylinderBetween([-1.8, -0.4, 0], [-0.7, -0.4, 0], 0.06, 0xf2b84b);
      arrow([-2.45, -0.4, 0], [-0.82, -0.4, 0], 0xf2b84b);
      arrow([0, 2.62, 0], [0, 3.55, 0], 0x61d9c6);
      arrow([0, -2.62, 0], [0, -3.55, 0], 0xdc5a82);
      arrow([1.35, 2.2, 0], [0.55, 1.72, 0], 0x61d9c6);
      addLabel('进料', [-2.2, -0.05, 0], '#f2b84b');
      addLabel('塔顶产品', [0.7, 3.45, 0], '#61d9c6');
      addLabel('塔底产品', [0.72, -3.45, 0], '#dc5a82');
      addLabel('塔板', [1.25, 0.35, 0], '#f2fbf8');
    }

    function buildApparatus() {
      const flask = new THREE.Mesh(new THREE.SphereGeometry(0.82, 48, 32), material(0x8eb7bd, 0.18, 0.02, 0.42));
      flask.position.set(-2, -0.6, 0);
      staticGroup.add(flask);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.1, 32), material(0x8eb7bd, 0.2, 0.02, 0.46));
      neck.position.set(-2, 0.35, 0);
      staticGroup.add(neck);
      const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.34, 32), material(0x30323a, 0.42, 0.18));
      burner.position.set(-2, -1.75, 0);
      staticGroup.add(burner);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.72, 32), material(0xf2b84b, 0.22, 0.0, 0.75));
      flame.position.set(-2, -1.25, 0);
      staticGroup.add(flame);
      cylinderBetween([-1.8, 0.75, 0], [0.1, 0.55, 0], 0.055, 0x61d9c6);
      cylinderBetween([0.1, 0.55, 0], [1.55, -0.45, 0], 0.055, 0x61d9c6);
      const trough = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.52, 1.2), material(0x23464a, 0.26, 0.02, 0.48));
      trough.position.set(1.55, -1.04, 0);
      staticGroup.add(trough);
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 1.55, 40), material(0x8eb7bd, 0.2, 0.02, 0.36));
      jar.position.set(1.55, -0.12, 0);
      staticGroup.add(jar);
      for (let i = 0; i < 8; i += 1) {
        const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.055 + i * 0.004, 20, 16), material(0x61d9c6, 0.2, 0.02, 0.62));
        bubble.position.set(0.55 + i * 0.17, -0.62 + (i % 3) * 0.16, 0.05 * (i % 2));
        animated.add(bubble);
      }
      arrow([-0.65, 0.62, 0], [1.25, -0.34, 0], 0x61d9c6);
      addLabel('发生装置', [-2.0, 0.98, 0], '#f2b84b');
      addLabel('氧气流向', [0.35, 0.9, 0], '#61d9c6');
      addLabel('集气瓶', [2.15, 0.58, 0], '#f2fbf8');
    }

    if (SPEC.templateId === 'molecule-3d') buildMolecule(SPEC.chemistry);
    if (SPEC.templateId === 'reaction-3d') buildReaction();
    if (SPEC.templateId === 'crystal-3d') buildCrystal();
    if (SPEC.templateId === 'orbital-3d') buildOrbital();
    if (SPEC.templateId === 'equipment-3d') buildEquipment();
    if (SPEC.templateId === 'apparatus-3d') buildApparatus();

    const grid = new THREE.GridHelper(8, 16, 0x1f6965, 0x1a3435);
    grid.position.y = -2.35;
    scene.add(grid);

    document.getElementById('toggleLabels').addEventListener('click', () => {
      labelsVisible = !labelsVisible;
      labels.visible = labelsVisible;
    });
    document.getElementById('toggleAnimation').addEventListener('click', () => {
      animationEnabled = !animationEnabled;
    });
    document.getElementById('resetCamera').addEventListener('click', () => {
      camera.position.set(5.8, 4.6, 6.8);
      controls.target.set(0, 0, 0);
      controls.update();
    });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.getElementById('loading').classList.add('hidden');
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      if (animationEnabled) {
        animated.rotation.y = Math.sin(t * 0.7) * 0.22;
        animated.position.y = Math.sin(t * 1.4) * 0.05;
      }
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
  </script>
</body>
</html>`;
}

export function createSceneRecord(conversationId: string, sceneSpec: SceneSpec, htmlContent: string): SceneRecord {
  return {
    sceneId: sceneSpec.sceneId,
    conversationId,
    title: sceneSpec.title,
    templateId: sceneSpec.templateId,
    htmlContent,
    sceneSpec,
    createdAt: new Date().toISOString(),
  };
}

export function serializeSceneRecord(record: SceneRecord): string {
  return `${SCENE_RECORD_PREFIX}${JSON.stringify(record)}`;
}

export function parseSceneRecord(content: unknown): SceneRecord | null {
  if (typeof content !== 'string' || !content.startsWith(SCENE_RECORD_PREFIX)) return null;
  try {
    const parsed = JSON.parse(content.slice(SCENE_RECORD_PREFIX.length)) as SceneRecord;
    return parsed?.sceneId && parsed?.htmlContent ? parsed : null;
  } catch {
    return null;
  }
}

export function shouldGenerateImmediately(message: string, generationMode?: string): boolean {
  if (generationMode === 'generate' || generationMode === 'direct') return true;
  return /直接生成|跳过|别问|不用问|generate directly|skip/i.test(message);
}

export function buildSceneUrl(context: any, conversationId: string, sceneId: string): string {
  const encoded = `conversation_id=${encodeURIComponent(conversationId)}&scene_id=${encodeURIComponent(sceneId)}`;
  const req = context?.request;
  const host = req?.headers?.get?.('x-forwarded-host') ?? req?.headers?.get?.('host');
  const proto = req?.headers?.get?.('x-forwarded-proto') ?? (String(host).includes('localhost') ? 'http' : 'https');
  if (host && !String(host).match(/:9\d{3}$/)) return `${proto}://${host}/scene?${encoded}`;

  const rawUrl = typeof req?.url === 'string' ? req.url : '';
  try {
    const url = rawUrl ? new URL(rawUrl) : null;
    if (url && !url.host.match(/:9\d{3}$/)) return `${url.origin}/scene?${encoded}`;
  } catch {
    /* noop */
  }
  return `/scene?${encoded}`;
}

export function finalAnswer(
  spec: SceneSpec,
  sceneUrl: string,
  generation?: { source?: 'model' | 'fallback'; model?: string; error?: string },
): string {
  const sourceLine = generation?.source === 'model'
    ? `生成来源：模型 ${generation.model ?? ''}`.trim()
    : generation?.source === 'fallback'
      ? `生成来源：离线模板兜底${generation.error ? `（${generation.error}）` : ''}`
      : '';

  return [
    `已生成《${spec.title}》。`,
    '',
    `模板：${spec.templateId}`,
    `教学目标：${spec.teachingGoal}`,
    sourceLine,
    `访问链接：${sceneUrl}`,
    '',
    '右侧可以预览 3D 页面；链接可直接用于课堂打开。'
  ].filter(Boolean).join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
