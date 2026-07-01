/**
 * History handler -- EdgeOne Makers Cloud Function
 * POST /history
 * 从 context.store 读取会话历史
 */

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=UTF-8' };

export async function onRequestPost(context: any): Promise<Response> {
  try {
    const body = await context.request.json();
    const conversationId = body?.conversation_id || body?.conversationId || '';

    if (!conversationId || !context.store) {
      return new Response(JSON.stringify({ messages: [] }), { status: 200, headers: JSON_HEADERS });
    }

    const history = await context.store.getMessages({
      conversationId,
      limit: 50,
      order: 'asc',
    });

    const messages = (history || [])
      .filter((m: any) => m.role === 'user' || m.role === 'assistant')
      .map((m: any) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : String(m.content || ''),
        timestamp: m.createdAt || 0,
      }));

    return new Response(JSON.stringify({ conversation_id: conversationId, messages }), {
      status: 200, headers: JSON_HEADERS,
    });
  } catch (e) {
    return new Response(JSON.stringify({ messages: [] }), { status: 200, headers: JSON_HEADERS });
  }
}
