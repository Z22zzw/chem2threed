/**
 * Public scene route.
 *
 * GET /scene?conversation_id=...&scene_id=...
 * Reads the generated ChemScene HTML from the EdgeOne conversation store and
 * returns it as text/html. This turns the current deployed app into the scene
 * hosting surface without requiring a runtime CLI deployment.
 */

import { createLogger } from '../_logger';
import { parseSceneRecord } from '../../agents/_chemScene';
import { getLocalMessages } from '../../agents/_localStore';

const logger = createLogger('scene');

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'no-store',
    },
  });
}

function getQuery(context: any, key: string): string {
  const rawUrl = typeof context?.request?.url === 'string' ? context.request.url : '';
  try {
    const url = new URL(rawUrl || 'https://local.invalid/scene');
    const value = url.searchParams.get(key);
    return value?.trim() ?? '';
  } catch {
    return '';
  }
}

function findSceneHtml(messages: unknown[], sceneId: string): string | null {
  for (const message of messages) {
    const record = parseSceneRecord((message as any)?.content);
    if (record?.sceneId === sceneId) return record.htmlContent;
  }
  return null;
}

function findLocalSceneHtml(conversationId: string, sceneId: string): string | null {
  const messages = getLocalMessages({
    conversationId,
    limit: 200,
    order: 'desc',
  });
  return findSceneHtml(messages, sceneId);
}

export async function onRequestGet(context: any): Promise<Response> {
  const startTime = Date.now();
  const conversationId = getQuery(context, 'conversation_id') || getQuery(context, 'conversationId');
  const sceneId = getQuery(context, 'scene_id') || getQuery(context, 'sceneId');
  const store = context.agent?.store;

  logger.log(`[scene] start sceneId=${sceneId || '-'} conversationId=${conversationId || '-'}`);

  if (!conversationId || !sceneId || !store) {
    return htmlResponse(notFoundHtml('缺少场景参数。'), 400);
  }

  try {
    const messages = await store.getMessages({
      conversationId,
      limit: 100,
      order: 'desc',
    });

    if (Array.isArray(messages)) {
      const html = findSceneHtml(messages, sceneId);
      if (html) {
        logger.log(`[scene] found in ${Date.now() - startTime}ms`);
        return htmlResponse(html);
      }
    }

    const localHtml = findLocalSceneHtml(conversationId, sceneId);
    if (localHtml) {
      logger.log(`[scene] found in local fallback in ${Date.now() - startTime}ms`);
      return htmlResponse(localHtml);
    }

    logger.log(`[scene] not found in ${Date.now() - startTime}ms`);
    return htmlResponse(notFoundHtml('没有找到这个 3D 场景，可能已被删除或会话 ID 不匹配。'), 404);
  } catch (e) {
    logger.error('[scene] failed:', e);
    const localHtml = findLocalSceneHtml(conversationId, sceneId);
    if (localHtml) {
      logger.log(`[scene] local fallback success in ${Date.now() - startTime}ms`);
      return htmlResponse(localHtml);
    }
    return htmlResponse(notFoundHtml('读取 3D 场景失败，请稍后重试。'), 500);
  }
}

function notFoundHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ChemScene 场景不可用</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #071012;
      color: #f2fbf8;
      font-family: "Segoe UI", Arial, sans-serif;
    }
    main {
      width: min(520px, calc(100vw - 32px));
      border: 1px solid rgba(97, 217, 198, 0.28);
      border-radius: 8px;
      padding: 24px;
      background: rgba(13, 22, 24, 0.82);
    }
    h1 { margin: 0 0 12px; font-size: 24px; }
    p { margin: 0; color: #9db7b2; line-height: 1.7; }
  </style>
</head>
<body>
  <main>
    <h1>ChemScene 场景不可用</h1>
    <p>${escapeHtml(message)}</p>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
