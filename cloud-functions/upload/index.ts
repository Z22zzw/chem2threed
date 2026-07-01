/**
 * Upload handler -- EdgeOne Makers Cloud Function
 * POST /upload
 * 接收文件，提取文本，返回内容
 * Makers 无状态环境，文件内容直接返回给前端
 */

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=UTF-8' };

export async function onRequestPost(context: any): Promise<Response> {
  try {
    const contentType = context.request.headers?.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return new Response(JSON.stringify({ error: '需要 multipart/form-data' }), {
        status: 400, headers: JSON_HEADERS,
      });
    }

    const formData = await context.request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: '未提供文件' }), {
        status: 400, headers: JSON_HEADERS,
      });
    }

    const buffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(buffer);

    // 简单文本提取（PDF/DOCX 在 Makers 环境无法用 Python，直接尝试文本读取）
    let extractedText = text;
    if (file.name.endsWith('.pdf')) {
      // PDF 二进制，尝试提取可读文本片段
      extractedText = buffer.byteLength > 0 ? '[PDF文件，请在对话中描述内容]' : '';
    } else if (file.name.endsWith('.docx')) {
      extractedText = '[DOCX文件，请在对话中描述内容]';
    }

    return new Response(JSON.stringify({
      filename: file.name,
      size: file.size,
      extractedText: extractedText.slice(0, 8000),
    }), { status: 200, headers: JSON_HEADERS });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || '上传失败' }), {
      status: 500, headers: JSON_HEADERS,
    });
  }
}
