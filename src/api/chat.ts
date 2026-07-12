// SSE 流式对话接口
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { type CoreMessage } from 'ai';
import { runAgent } from '../agent/index.js';
import { appendHistory } from '../services/storage.js';
import { nanoid } from 'nanoid';

const app = new Hono();

interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'tool'; content: string }>;
  attachments?: Array<{ type: string; path: string; extractedText?: string }>;
}

app.post('/', async (c) => {
  const body = await c.req.json<ChatRequest>();

  // 组装 attachments 文本到用户消息
  let messages: CoreMessage[] = body.messages.map(m => ({
    role: m.role as any,
    content: m.content,
  }));

  // 如果有附件文本，追加到最后一条用户消息
  if (body.attachments && body.attachments.length > 0) {
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { lastUserIdx = i; break; }
    }
    if (lastUserIdx >= 0) {
      const attachTexts = body.attachments
        .map(a => a.extractedText)
        .filter(Boolean)
        .join('\n\n');
      if (attachTexts) {
        const orig = messages[lastUserIdx].content;
        messages[lastUserIdx].content = `${orig}\n\n[用户上传的文件内容]\n${attachTexts}`;
      }
    }
  }

  return streamSSE(c, async (stream) => {
    const sessionId = nanoid(12);
    let lastGeneratedUrl: string | undefined;
    let lastTitle: string = '';
    let lastTemplate: string = '';

    try {
      const result = runAgent(messages);

      // 发送思考过程和文本
      (async () => {
        try {
          for await (const delta of result.textStream) {
            await stream.writeSSE({
              event: 'text',
              data: JSON.stringify({ content: delta }),
            });
          }
        } catch (err: any) {
          // textStream 错误不打断
        }
      })();

      // 处理工具调用
      try {
        for await (const part of result.fullStream) {
          if (part.type === 'tool-call') {
            await stream.writeSSE({
              event: 'tool_call',
              data: JSON.stringify({ tool: part.toolName, args: part.args }),
            });
          } else if (part.type === 'tool-result') {
            await stream.writeSSE({
              event: 'tool_result',
              data: JSON.stringify({ tool: part.toolName, result: part.result }),
            });
            // 捕获部署结果
            if (part.toolName === 'deploy' && part.result?.success && part.result?.url) {
              lastGeneratedUrl = part.result.url;
            }
            if (part.toolName === 'generate' && part.result?.success) {
              lastTemplate = part.result.template || '';
            }
            if (part.toolName === 'parseInput' && part.result?.modelingObject) {
              lastTitle = part.result.modelingObject;
            }
          }
        }
      } catch (err: any) {
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({ message: err.message || 'Agent 执行出错' }),
        });
      }

      // 等待流完成
      await result.text;

      // 发送完成事件
      await stream.writeSSE({
        event: 'done',
        data: JSON.stringify({
          sessionId,
          url: lastGeneratedUrl,
          title: lastTitle,
          template: lastTemplate,
        }),
      });

      // 保存历史
      if (lastTitle) {
        const firstUserMsg = body.messages.find(m => m.role === 'user');
        await appendHistory({
          sessionId,
          timestamp: new Date().toISOString(),
          input: firstUserMsg?.content || '',
          outputUrl: lastGeneratedUrl,
          template: lastTemplate,
          title: lastTitle,
        });
      }
    } catch (err: any) {
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({ message: err.message || '服务器错误' }),
      });
    }
  });
});

export default app;
