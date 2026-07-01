/**
 * Preview handler -- EdgeOne Makers Cloud Function
 * GET /preview?id=xxx
 * 由于 Makers 无状态，预览通过前端 iframe srcdoc 实现，
 * 此函数返回提示信息。
 */

export async function onRequestGet(context: any): Promise<Response> {
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: '缺少 id 参数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Makers 无状态环境无法持久化文件
  // 预览通过前端 SSE 收到的 htmlContent 用 iframe srcdoc 实现
  return new Response(JSON.stringify({
    id,
    message: '预览通过前端 iframe srcdoc 实现，请在前端使用 generate 工具返回的 htmlContent',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
