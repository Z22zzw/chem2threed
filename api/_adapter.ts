import { randomUUID } from 'node:crypto';
import {
  appendLocalMessage,
  clearLocalMessages,
  deleteLocalConversation,
  getLocalMessages,
  listLocalConversations,
} from '../agents/_localStore';

type VercelRequest = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
  on?: (event: string, listener: () => void) => void;
};

type VercelResponse = {
  statusCode: number;
  setHeader: (name: string, value: string | string[]) => void;
  end: (body?: string | Buffer) => void;
  write: (chunk: Buffer) => void;
};

function firstHeader(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function normalizeBody(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (Buffer.isBuffer(raw)) {
    const text = raw.toString('utf8');
    if (!text.trim()) return {};
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof raw === 'string') {
    if (!raw.trim()) return {};
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
}

function headersOf(req: VercelRequest): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers ?? {})) {
    if (Array.isArray(value)) {
      value.forEach(item => headers.append(key, item));
    } else if (value != null) {
      headers.set(key, value);
    }
  }
  return headers;
}

function requestUrl(req: VercelRequest, headers: Headers): string {
  const host = headers.get('x-forwarded-host') || headers.get('host') || 'localhost';
  const proto = headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return new URL(req.url || '/', `${proto}://${host}`).toString();
}

function conversationIdOf(
  req: VercelRequest,
  headers: Headers,
  body: Record<string, unknown>,
): string {
  const fromHeader = headers.get('makers-conversation-id');
  if (fromHeader?.trim()) return fromHeader.trim();

  const fromBody = body.conversation_id ?? body.conversationId;
  if (typeof fromBody === 'string' && fromBody.trim()) return fromBody.trim();

  const fromQuery = firstHeader(req.query?.conversation_id) || firstHeader(req.query?.conversationId);
  if (fromQuery.trim()) return fromQuery.trim();

  return randomUUID();
}

const store = {
  async appendMessage(args: Record<string, unknown>) {
    appendLocalMessage(args);
  },
  async getMessages(args: { conversationId: string; limit?: number; order?: 'asc' | 'desc' }) {
    return getLocalMessages(args);
  },
  async listConversations(args: {
    userId?: string;
    limit?: number;
    order?: 'asc' | 'desc';
    after?: string;
    before?: string;
  }) {
    return listLocalConversations(args);
  },
  async clearMessages(args: { conversationId: string }) {
    clearLocalMessages(args.conversationId);
  },
  async deleteConversation(args: { conversationId: string }) {
    deleteLocalConversation(args.conversationId);
  },
};

export function createVercelContext(req: VercelRequest) {
  const body = normalizeBody(req.body);
  const headers = headersOf(req);
  const abortController = new AbortController();
  req.on?.('close', () => abortController.abort());

  const request = {
    body,
    headers,
    method: req.method || 'GET',
    signal: abortController.signal,
    url: requestUrl(req, headers),
    async json() {
      return body;
    },
  };

  return {
    request,
    conversation_id: conversationIdOf(req, headers, body),
    store,
    agent: { store },
    utils: {
      abortActiveRun(conversationId: string) {
        return {
          aborted: false,
          conversationId,
          runtime: 'vercel',
          message: 'Vercel adapter uses client-side stream abort; server-side abortActiveRun is not available.',
        };
      },
    },
    env: process.env,
  };
}

export async function sendResponse(res: VercelResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (!response.body) {
    res.end(await response.text());
    return;
  }

  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) res.write(Buffer.from(value));
    }
  } finally {
    res.end();
  }
}

export function methodNotAllowed(res: VercelResponse, allowed: string): void {
  res.statusCode = 405;
  res.setHeader('Allow', allowed);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ status: 'error', message: `Method not allowed. Use ${allowed}.` }));
}
