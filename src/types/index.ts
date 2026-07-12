// 共享类型定义

export interface Atom {
  element: string;
  position: [number, number, number];
  label?: string;
}

export interface Bond {
  from: number;
  to: number;
  type: 'single' | 'double' | 'triple';
}

export interface MoleculeParams {
  title: string;
  description?: string;
  atoms: Atom[];
  bonds: Bond[];
  interactions: string[];
  colorScheme: 'cpk' | 'soft' | 'highContrast';
  language: 'zh' | 'en';
  showLabels: boolean;
  showBondLength: boolean;
}

export interface ReactionStep {
  label: string;
  atoms: Atom[];
  bonds: Bond[];
}

export interface ReactionParams {
  title: string;
  description?: string;
  steps: ReactionStep[];
  interactions: string[];
  colorScheme: 'cpk' | 'soft' | 'highContrast';
  language: 'zh' | 'en';
}

export interface ParsedInput {
  subject: string;
  modelingObject: string;
  knowledgePoint: string;
  teachingGoal: string;
  confidence: number;
  suggestedTemplate: string;
  missingInfo: string[];
  rawText: string;
}

export interface ClarifyQuestion {
  field: string;
  question: string;
  defaultValue?: string;
  options?: string[];
}

export interface Attachment {
  type: 'image' | 'file';
  path: string;
  mimeType?: string;
  extractedText?: string;
}

export interface SessionState {
  sessionId: string;
  messages: Array<{ role: 'user' | 'assistant' | 'tool'; content: string }>;
  attachments: Attachment[];
  parsedInput?: ParsedInput;
  generatedHtml?: string;
  htmlPath?: string;
  previewUrl?: string;
  deployedUrl?: string;
  status: 'idle' | 'parsing' | 'clarifying' | 'generating' | 'deploying' | 'done' | 'error';
}

export interface HistoryEntry {
  sessionId: string;
  timestamp: string;
  input: string;
  outputUrl?: string;
  template: string;
  title: string;
}

export interface SceneTemplate {
  id: string;
  name: string;
  description: string;
  applicableKeywords: string[];
  render: (params: any) => string;
}
