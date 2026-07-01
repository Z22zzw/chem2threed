/**
 * Chat handler -- EdgeOne Makers
 *
 * File path agents/chat/index.ts maps to POST /chat.
 * 流式输出 SSE，包含 LLM 文本、工具调用、工具结果。
 */

import { getModelConfig } from '../_model';
import { createLogger } from '../_logger';
import { buildCustomTools, type ToolRegistry } from '../_tools';
import { SYSTEM_PROMPT } from '../_system-prompt';

const logger = createLogger('chat');
const encoder = new TextEncoder();
const MAX_TOOL_ROUNDS = 6;

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',
};

type ChatMessage = Record<string, any>;

interface ToolCallAcc {
  id: string;
  name: string;
  arguments: string;
}

interface StreamChunk {
  contentDelta?: string;
  toolCalls?: ToolCallAcc[];
}

function sseFrame(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function sendEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: string,
  data: Record<string, unknown>,
) {
  controller.enqueue(encoder.encode(sseFrame(event, data)));
}

function buildPayload(model: string, messages: ChatMessage[], toolRegistry: ToolRegistry): ChatMessage {
  const payload: ChatMessage = {
    model,
    messages,
    stream: true,
    stream_options: { include_usage: true },
  };
  if (toolRegistry.hasTools()) {
    payload.tools = toolRegistry.tools;
    payload.tool_choice = 'auto';
  }
  return payload;
}

function assistantToolMessage(content: string, toolCalls: ToolCallAcc[]): ChatMessage {
  return {
    role: 'assistant',
    content,
    tool_calls: toolCalls.map(tc => ({
      id: tc.id,
      type: 'function',
      function: { name: tc.name, arguments: tc.arguments },
    })),
  };
}

async function* parseStream(response: Response, signal?: AbortSignal): AsyncGenerator<StreamChunk> {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  const toolCalls = new Map<number, ToolCallAcc>();
  let buffer = '';
  let finishReason = '';

  try {
    while (!signal?.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      let streamDone = false;
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed === 'data: [DONE]') { streamDone = true; break; }
        if (!trimmed.startsWith('data: ')) continue;
        try {
          const chunk = JSON.parse(trimmed.slice(6));
          const choice = chunk?.choices?.[0];
          if (!choice) continue;
          if (choice.finish_reason) finishReason = choice.finish_reason;
          const delta = choice.delta ?? {};
          if (delta.content) yield { contentDelta: delta.content };
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              const acc = toolCalls.get(idx) ?? { id: '', name: '', arguments: '' };
              if (tc.id) acc.id = tc.id;
              if (tc.function?.name) acc.name = tc.function.name;
              if (tc.function?.arguments) acc.arguments += tc.function.arguments;
              toolCalls.set(idx, acc);
            }
          }
        } catch {}
      }
      if (streamDone) break;
    }
  } finally {
    reader.releaseLock();
  }
  if (toolCalls.size > 0 && finishReason === 'tool_calls') {
    yield { toolCalls: [...toolCalls.entries()].sort(([a],[b]) => a-b).map(([,tc]) => tc) };
  }
}

export async function onRequest(context: any) {
  const cid: string = context.conversation_id ?? '';
  const rawMessage = context.request.body?.message;
  const attachments = context.request.body?.attachments;

  logger.log(`[handler] conversation_id: ${cid}, message: ${rawMessage?.slice(0,100)}`);

  if (typeof rawMessage !== 'string' || rawMessage.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'message is required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const message = rawMessage.slice(0, 10000);
  const signal: AbortSignal | undefined = context.request.signal;
  const modelConfig = getModelConfig(context.env);
  const toolRegistry = buildCustomTools(context);

  // 组装消息
  let userContent = message;
  if (attachments && attachments.length > 0) {
    const attachTexts = attachments
      .map((a: any) => a.extractedText)
      .filter(Boolean)
      .join('\n\n');
    if (attachTexts) userContent += '\n\n[用户上传的文件内容]\n' + attachTexts;
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ];

  let assistantContent = '';

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      if (!modelConfig.apiKey) {
        sendEvent(controller, 'error', { message: 'AI_GATEWAY_API_KEY 未配置' });
        controller.close();
        return;
      }

      try {
        for (let round = 1; round <= MAX_TOOL_ROUNDS; round++) {
          if (signal?.aborted) break;

          const url = `${modelConfig.baseUrl.replace(/\/$/, '')}/chat/completions`;
          const payload = buildPayload(modelConfig.model, messages, toolRegistry);
          logger.log(`[handler] round ${round}, messages: ${messages.length}`);

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${modelConfig.apiKey}`,
            },
            body: JSON.stringify(payload),
            signal,
          });

          if (!response.ok) {
            const errBody = await response.text().catch(() => '');
            sendEvent(controller, 'error', {
              message: `LLM API error: ${response.status}`,
              detail: errBody.slice(0, 500),
            });
            break;
          }

          let roundContent = '';
          let roundToolCalls: ToolCallAcc[] | null = null;

          for await (const chunk of parseStream(response, signal)) {
            if (signal?.aborted) break;
            if (chunk.contentDelta) {
              roundContent += chunk.contentDelta;
              assistantContent += chunk.contentDelta;
              sendEvent(controller, 'text', { content: chunk.contentDelta });
            }
            if (chunk.toolCalls) roundToolCalls = chunk.toolCalls;
          }

          if (!roundToolCalls?.length) break;

          // 执行工具
          messages.push(assistantToolMessage(roundContent, roundToolCalls));
          for (const tc of roundToolCalls) {
            sendEvent(controller, 'tool_call', { tool: tc.name, args: safeParse(tc.arguments) });
          }

          for (const tc of roundToolCalls) {
            const result = await toolRegistry.execute(tc.name, tc.arguments);
            sendEvent(controller, 'tool_result', { tool: tc.name, result: safeParse(result) });
            messages.push({ role: 'tool', tool_call_id: tc.id, content: result });
          }
        }
      } catch (e: unknown) {
        const error = e as Error;
        if (error.name !== 'AbortError') {
          logger.error('[stream] error:', error.message);
          sendEvent(controller, 'error', { message: error.message || String(e) });
        }
      } finally {
        // 保存到会话存储
        if (assistantContent && context.store) {
          try {
            await context.store.appendMessage({ conversationId: cid, role: 'assistant', content: assistantContent });
          } catch {}
        }
        sendEvent(controller, 'done', {});
        controller.close();
      }
    },
    cancel() { logger.log('[stream] client disconnected'); },
  });

  return new Response(stream, { status: 200, headers: SSE_HEADERS });
}

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return s; }
}
