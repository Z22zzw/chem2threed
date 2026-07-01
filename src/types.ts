export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  /**
   * True while the assistant is actively producing this message
   * (between the first text_delta and the final done/error event).
   * Drives the in-bubble blinking caret to give the user feedback
   * that more content is still streaming. Cleared once done/error fires.
   */
  streaming?: boolean;
  attachments?: AttachmentMeta[];
  clarifyCard?: ClarifyCard;
}

export interface ToolLampState {
  id: string;
  label: string;
  icon: string;
  active: boolean;
  animKey: number;   // Incremented on each activation to remount and replay animation
}

/**
 * Lightweight summary of a conversation, returned by /conversations.
 * Used to render the left sidebar — does NOT contain full message content.
 */
export interface ConversationSummary {
  id: string;
  title: string;
  preview?: string;
  lastMessageAt?: number;
  createdAt?: number;
  userId?: string;
  messageCount?: number;
}

export interface ListConversationsParams {
  userId: string;
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export interface ListConversationsResponse {
  conversations: ConversationSummary[];
  nextCursor?: string;
  previousCursor?: string;
}

export interface AttachmentMeta {
  id: string;
  type: 'image' | 'file';
  fileName: string;
  mimeType: string;
  size: number;
  caption?: string;
  extractedText?: string;
  summary?: string;
  error?: string;
  dataUrl?: string;
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

export interface GenerationStatus {
  step: string;
  label: string;
  progress: number;
  detail?: string;
}

export interface SceneSpec {
  sceneId: string;
  templateId: string;
  title: string;
  teachingGoal: string;
  language: 'zh' | 'en';
  visualStyle: Record<string, unknown>;
  interactions: string[];
  chemistry: Record<string, unknown>;
}

export interface PreviewReadyPayload {
  sceneId: string;
  templateId: string;
  title: string;
  htmlContent: string;
}

export interface DeployDonePayload {
  success: boolean;
  sceneId: string;
  url: string;
  strategy?: string;
  deployedAt?: string;
}

export interface SceneErrorPayload {
  message: string;
  suggestion?: string;
  step?: string;
}
