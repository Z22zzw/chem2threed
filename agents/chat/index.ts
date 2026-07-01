/**
 * ChemScene Agent handler — EdgeOne Makers
 *
 * File path agents/chat/index.ts maps to POST /chat.
 * The handler keeps the starter template's SSE and Store conventions while
 * running the ChemScene pipeline:
 * parse -> optional clarify card -> model Scene Spec -> Three.js HTML -> /scene URL.
 */

import { createLogger } from '../_logger';
import { sseResponse, type SseEvent } from '../_sse';
import {
  buildSceneUrl,
  createClarifyCard,
  createSceneRecord,
  finalAnswer,
  parseChemRequest,
  renderThreeJsHtml,
  serializeSceneRecord,
  shouldGenerateImmediately,
  type AttachmentInput,
} from '../_chemScene';
import { appendLocalMessage } from '../_localStore';
import { buildSceneSpecWithModel } from '../_modelScene';

const logger = createLogger('chem-chat');

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizeAttachments(value: unknown): AttachmentInput[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> =>
      item !== null && typeof item === 'object' && !Array.isArray(item),
    )
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : undefined,
      type: typeof item.type === 'string' ? item.type : undefined,
      fileName: typeof item.fileName === 'string' ? item.fileName : undefined,
      mimeType: typeof item.mimeType === 'string' ? item.mimeType : undefined,
      size: typeof item.size === 'number' ? item.size : undefined,
      caption: typeof item.caption === 'string' ? item.caption : undefined,
      extractedText: typeof item.extractedText === 'string' ? item.extractedText : undefined,
      summary: typeof item.summary === 'string' ? item.summary : undefined,
      error: typeof item.error === 'string' ? item.error : undefined,
    }));
}

async function appendMessage(
  context: any,
  args: Record<string, unknown>,
  logLabel: string,
): Promise<void> {
  try {
    await context.store.appendMessage(args);
  } catch (e) {
    logger.error(`[store] failed to append ${logLabel}:`, e);
  }
  appendLocalMessage(args);
}

function progress(step: string, label: string, progressValue: number, detail?: string): SseEvent {
  return {
    event: 'generation_status',
    data: { step, label, progress: progressValue, detail },
  };
}

export async function onRequest(context: any) {
  const body = asObject(context.request.body ?? {});
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return new Response(
      JSON.stringify({ error: "'message' is required" }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const rawUserId = typeof body.userId === 'string'
    ? body.userId
    : (typeof body.user_id === 'string' ? body.user_id : '');
  const userId = rawUserId.trim() || undefined;
  const userMsgId = typeof body.userMsgId === 'string' ? body.userMsgId : undefined;
  const botMsgId = typeof body.botMsgId === 'string' ? body.botMsgId : undefined;
  const generationMode = typeof body.generationMode === 'string' ? body.generationMode : undefined;
  const clarifySelections = asObject(body.clarifySelections);
  const attachments = normalizeAttachments(body.attachments);
  const conversationId: string = context.conversation_id ?? '';
  const signal: AbortSignal | undefined = context.request.signal;

  logger.log(`[request] cid=${conversationId}, uid=${userId ?? '-'}, mode=${generationMode ?? '-'}, message="${message.slice(0, 80)}"`);

  if (userId && conversationId) {
    const appendArgs: Record<string, unknown> = {
      conversationId,
      role: 'user',
      content: message,
      userId,
    };
    if (userMsgId) appendArgs.messageId = userMsgId;
    await appendMessage(context, appendArgs, 'user');
  }

  return sseResponse(
    async function* () {
      yield progress('parse', '解析教学需求', 0.08);
      yield { event: 'tool_called', data: { tool: 'parse_chem_request' } };
      const parsed = parseChemRequest(message, attachments);
      yield progress('parse', '已识别建模对象', 0.18, parsed.modelingObject);

      if (attachments.length > 0) {
        yield { event: 'tool_called', data: { tool: 'analyze_attachment' } };
        yield progress('attachment', '已合并附件线索', 0.26, parsed.attachmentSummary.slice(0, 120));
      }

      const generateNow = shouldGenerateImmediately(message, generationMode) || Object.keys(clarifySelections).length > 0;
      if (!generateNow) {
        yield { event: 'tool_called', data: { tool: 'create_clarify_card' } };
        const card = createClarifyCard(parsed);
        yield {
          event: 'text_delta',
          data: {
            delta: `我识别到你要制作“${parsed.modelingObject}”。下面是可选设置，保留默认值也可以直接生成。`,
          },
        };
        yield { event: 'clarify_card', data: card };
        yield progress('clarify', '等待确认或直接生成', 0.34);
        if (conversationId) {
          await appendMessage(context, {
            conversationId,
            role: 'assistant',
            content: `我识别到你要制作“${parsed.modelingObject}”。下面是可选设置，保留默认值也可以直接生成。`,
            ...(botMsgId ? { messageId: botMsgId } : {}),
          }, 'assistant clarify');
        }
        return;
      }

      yield { event: 'tool_called', data: { tool: 'match_scene_template' } };
      yield progress('template', '匹配化学 3D 模板', 0.42, parsed.templateId);

      yield { event: 'tool_called', data: { tool: 'generate_scene_spec' } };
      yield progress('spec', '调用模型生成 Scene Spec', 0.5);
      const sceneResult = await buildSceneSpecWithModel(context, parsed, clarifySelections, attachments);
      const sceneSpec = sceneResult.spec;
      yield { event: 'scene_spec', data: sceneSpec };
      yield progress(
        'spec',
        sceneResult.source === 'model' ? '模型已生成 Scene Spec' : '使用离线模板兜底 Scene Spec',
        0.58,
        sceneResult.source === 'model'
          ? `${sceneResult.model ?? 'model'} · ${sceneSpec.title}`
          : sceneResult.error ?? sceneSpec.title,
      );

      if (signal?.aborted) return;

      yield { event: 'tool_called', data: { tool: 'render_threejs_html' } };
      const htmlContent = renderThreeJsHtml(sceneSpec);
      const record = createSceneRecord(conversationId, sceneSpec, htmlContent);
      yield progress('render', 'Three.js 页面已生成', 0.74, `${Math.round(htmlContent.length / 1024)} KB`);
      yield {
        event: 'preview_ready',
        data: {
          sceneId: sceneSpec.sceneId,
          templateId: sceneSpec.templateId,
          title: sceneSpec.title,
          htmlContent,
        },
      };

      if (conversationId) {
        await appendMessage(context, {
          conversationId,
          role: 'assistant',
          content: serializeSceneRecord(record),
          metadata: {
            chem_scene_record: true,
            sceneId: sceneSpec.sceneId,
            templateId: sceneSpec.templateId,
          },
        }, 'scene record');
      }

      yield { event: 'tool_called', data: { tool: 'deploy_scene_to_edgeone' } };
      yield { event: 'deploying', data: { sceneId: sceneSpec.sceneId, strategy: 'edgeone-app-scene-route' } };
      const sceneUrl = buildSceneUrl(context, conversationId, sceneSpec.sceneId);
      yield progress('deploy', '场景已发布为公开链接', 0.92, sceneUrl);
      yield {
        event: 'deploy_done',
        data: {
          success: true,
          sceneId: sceneSpec.sceneId,
          url: sceneUrl,
          strategy: 'edgeone-app-scene-route',
          deployedAt: new Date().toISOString(),
        },
      };

      const answer = finalAnswer(sceneSpec, sceneUrl, {
        source: sceneResult.source,
        model: sceneResult.model,
        error: sceneResult.error,
      });
      yield { event: 'text_delta', data: { delta: answer } };
      yield progress('done', '完成', 1, sceneSpec.title);

      if (conversationId) {
        await appendMessage(context, {
          conversationId,
          role: 'assistant',
          content: answer,
          ...(botMsgId ? { messageId: botMsgId } : {}),
        }, 'assistant final');
      }
    },
    { signal, logger },
  );
}
