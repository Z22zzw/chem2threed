/**
 * Scene feedback endpoint.
 *
 * The main regeneration flow goes through POST /chat with generationMode.
 * This endpoint records/normalizes feedback metadata for future analytics or
 * product tuning without blocking the current generation flow.
 */

import { createLogger } from '../_logger';

const logger = createLogger('scene-feedback');
const JSON_HEADERS = { 'Content-Type': 'application/json; charset=UTF-8' } as const;

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

async function readJsonBody(context: any): Promise<Record<string, unknown>> {
  try {
    const data = await context.request.json();
    return data && typeof data === 'object' && !Array.isArray(data)
      ? data as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function pickString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === 'string' ? value.trim() : '';
}

export async function onRequestPost(context: any): Promise<Response> {
  const body = await readJsonBody(context);
  const sceneId = pickString(body, 'sceneId') || pickString(body, 'scene_id');
  const conversationId = pickString(body, 'conversationId') || pickString(body, 'conversation_id');
  const feedback = pickString(body, 'feedback');

  logger.log(`[scene-feedback] scene=${sceneId || '-'} conversation=${conversationId || '-'} feedback="${feedback.slice(0, 80)}"`);

  return jsonResponse({
    status: 'ok',
    sceneId,
    conversationId,
    feedback,
    nextAction: 'Send a new /chat message with generationMode=generate to regenerate the scene.',
  });
}
