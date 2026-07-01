import { dirname, join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export interface LocalMemoryMessage {
  conversationId: string;
  messageId?: string;
  role?: string;
  content?: unknown;
  createdAt?: number;
  metadata?: Record<string, unknown>;
  userId?: string;
}

export interface LocalConversationSummary {
  id: string;
  title: string;
  preview?: string;
  lastMessageAt?: number;
  createdAt?: number;
  userId?: string;
  messageCount?: number;
}

type Order = 'asc' | 'desc';

interface LocalStoreState {
  messagesByConversation: Map<string, LocalMemoryMessage[]>;
  conversations: Map<string, LocalConversationSummary>;
}

interface LocalStoreDiskState {
  messagesByConversation?: Record<string, LocalMemoryMessage[]>;
  conversations?: Record<string, LocalConversationSummary>;
}

const GLOBAL_KEY = '__chemscene_agent_local_store__';
const TITLE_SNIPPET_MAX = 8;

function getState(): LocalStoreState {
  const root = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: LocalStoreState;
  };

  if (!root[GLOBAL_KEY]) {
    root[GLOBAL_KEY] = {
      messagesByConversation: new Map(),
      conversations: new Map(),
    };
  }

  return root[GLOBAL_KEY];
}

function getDiskPath(): string | null {
  try {
    if (typeof process === 'undefined' || typeof process.cwd !== 'function') return null;
    if (process.env.CHEMSCENE_LOCAL_STORE_PATH) return process.env.CHEMSCENE_LOCAL_STORE_PATH;
    if (process.env.VERCEL) return join(process.env.TMPDIR || '/tmp', 'chemscene-store.json');
    return join(process.cwd(), '.edgeone-local-store', 'chemscene-store.json');
  } catch {
    return null;
  }
}

function loadDiskState(): LocalStoreDiskState | null {
  const filePath = getDiskPath();
  if (!filePath || !existsSync(filePath)) return null;

  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as LocalStoreDiskState;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function syncFromDisk(): void {
  const disk = loadDiskState();
  if (!disk) return;

  const state = getState();
  state.messagesByConversation.clear();
  state.conversations.clear();

  for (const [conversationId, messages] of Object.entries(disk.messagesByConversation ?? {})) {
    if (!Array.isArray(messages)) continue;
    state.messagesByConversation.set(conversationId, messages);
  }

  for (const [conversationId, summary] of Object.entries(disk.conversations ?? {})) {
    if (!summary || typeof summary !== 'object') continue;
    state.conversations.set(conversationId, summary);
  }
}

function writeToDisk(): void {
  const filePath = getDiskPath();
  if (!filePath) return;

  try {
    const state = getState();
    const disk: LocalStoreDiskState = {
      messagesByConversation: Object.fromEntries(state.messagesByConversation.entries()),
      conversations: Object.fromEntries(state.conversations.entries()),
    };
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(disk), 'utf8');
  } catch {
    /* Local persistence is only a development fallback. */
  }
}

function contentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map(item => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          return String(obj.text ?? obj.output_text ?? '');
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  if (content && typeof content === 'object') {
    const obj = content as Record<string, unknown>;
    if (typeof obj.text === 'string') return obj.text;
    if ('content' in obj) return contentToText(obj.content);
    if ('output' in obj) return contentToText(obj.output);
  }
  return '';
}

function isSceneRecord(message: LocalMemoryMessage): boolean {
  return Boolean(
    message.metadata?.chem_scene_record ||
      (typeof message.content === 'string' && message.content.startsWith('__CHEMSCENE_RECORD__')),
  );
}

function titleFrom(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'New chat';
  if (cleaned.length <= TITLE_SNIPPET_MAX) return cleaned;
  return `${cleaned.slice(0, TITLE_SNIPPET_MAX)}...`;
}

function firstUserTitle(messages: LocalMemoryMessage[]): string {
  for (const msg of messages) {
    if (msg.role !== 'user') continue;
    const text = contentToText(msg.content);
    if (text.trim()) return titleFrom(text);
  }
  return 'New chat';
}

function lastVisiblePreview(messages: LocalMemoryMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (isSceneRecord(msg)) continue;
    const text = contentToText(msg.content).replace(/\s+/g, ' ').trim();
    if (text) return text.length > 80 ? `${text.slice(0, 80)}...` : text;
  }
  return undefined;
}

function summarizeConversation(conversationId: string): LocalConversationSummary | null {
  const state = getState();
  const messages = state.messagesByConversation.get(conversationId) ?? [];
  if (messages.length === 0) return null;

  const existing = state.conversations.get(conversationId);
  const createdAt = existing?.createdAt ?? messages[0]?.createdAt ?? Date.now();
  const lastMessageAt = messages[messages.length - 1]?.createdAt ?? createdAt;
  const userId = existing?.userId ?? messages.find(msg => msg.userId)?.userId;

  return {
    id: conversationId,
    title: firstUserTitle(messages),
    preview: lastVisiblePreview(messages),
    createdAt,
    lastMessageAt,
    userId,
    messageCount: messages.length,
  };
}

export function appendLocalMessage(args: Record<string, unknown>): void {
  const conversationId = typeof args.conversationId === 'string' ? args.conversationId.trim() : '';
  const role = typeof args.role === 'string' ? args.role : undefined;
  if (!conversationId || !role) return;

  syncFromDisk();
  const state = getState();
  const messages = state.messagesByConversation.get(conversationId) ?? [];
  const messageId = typeof args.messageId === 'string' ? args.messageId : undefined;

  if (messageId && messages.some(msg => msg.messageId === messageId)) {
    return;
  }

  const existing = state.conversations.get(conversationId);
  const message: LocalMemoryMessage = {
    conversationId,
    messageId,
    role,
    content: args.content,
    createdAt: Date.now(),
    metadata: args.metadata && typeof args.metadata === 'object'
      ? args.metadata as Record<string, unknown>
      : undefined,
    userId: typeof args.userId === 'string' ? args.userId : existing?.userId,
  };

  messages.push(message);
  state.messagesByConversation.set(conversationId, messages);

  const summary = summarizeConversation(conversationId);
  if (summary) state.conversations.set(conversationId, summary);
  writeToDisk();
}

export function getLocalMessages(args: {
  conversationId: string;
  limit?: number;
  order?: Order;
}): LocalMemoryMessage[] {
  syncFromDisk();
  const state = getState();
  const conversationId = args.conversationId.trim();
  const messages = [...(state.messagesByConversation.get(conversationId) ?? [])];
  const ordered = args.order === 'desc' ? messages.reverse() : messages;
  const limit = Number.isFinite(args.limit) && args.limit && args.limit > 0
    ? Math.floor(args.limit)
    : ordered.length;
  return ordered.slice(0, limit);
}

export function listLocalConversations(args: {
  userId?: string;
  limit?: number;
  order?: Order;
  after?: string;
  before?: string;
}): {
  conversations: LocalConversationSummary[];
  nextCursor?: string;
  previousCursor?: string;
} {
  syncFromDisk();
  const state = getState();
  const limit = args.limit && args.limit > 0 ? Math.floor(args.limit) : 20;

  let items = [...state.conversations.values()];
  if (args.userId) {
    items = items.filter(item => !item.userId || item.userId === args.userId);
  }

  items.sort((a, b) => {
    const left = a.lastMessageAt ?? a.createdAt ?? 0;
    const right = b.lastMessageAt ?? b.createdAt ?? 0;
    return args.order === 'asc' ? left - right : right - left;
  });

  let start = 0;
  const cursor = args.after || args.before;
  if (cursor) {
    const idx = items.findIndex(item => item.id === cursor);
    if (idx >= 0) start = idx + 1;
  }

  const page = items.slice(start, start + limit);
  const hasMore = start + limit < items.length;
  return {
    conversations: page,
    nextCursor: hasMore ? page[page.length - 1]?.id : undefined,
  };
}

export function clearLocalMessages(conversationId: string): void {
  syncFromDisk();
  const state = getState();
  const id = conversationId.trim();
  state.messagesByConversation.delete(id);
  state.conversations.delete(id);
  writeToDisk();
}

export function deleteLocalConversation(conversationId: string): void {
  clearLocalMessages(conversationId);
}
