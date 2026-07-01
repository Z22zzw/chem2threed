/**
 * Upload handler for ChemScene.
 *
 * POST /upload
 * Body: { fileName, mimeType, size, type, base64, caption? }
 * Returns metadata with extractedText/summary when possible.
 */

import { createLogger } from '../_logger';

const logger = createLogger('upload');
const JSON_HEADERS = { 'Content-Type': 'application/json; charset=UTF-8' } as const;
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_TEXT = 24_000;

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
  return typeof value === 'string' ? value : '';
}

function decodeBase64(raw: string): Buffer {
  const base64 = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw;
  return Buffer.from(base64, 'base64');
}

function summarizeText(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > 180 ? `${cleaned.slice(0, 180)}...` : cleaned;
}

function trimText(text: string): string {
  return text.replace(/\u0000/g, '').trim().slice(0, MAX_TEXT);
}

async function extractText(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
  const lowerName = fileName.toLowerCase();
  if (mimeType.startsWith('text/') || lowerName.endsWith('.txt') || lowerName.endsWith('.md')) {
    return trimText(buffer.toString('utf8'));
  }

  if (mimeType === 'application/pdf' || lowerName.endsWith('.pdf')) {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return trimText(String(result.text ?? ''));
    } finally {
      await parser.destroy();
    }
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx')
  ) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return trimText(result.value ?? '');
  }

  return '';
}

export async function onRequestPost(context: any): Promise<Response> {
  const startTime = Date.now();
  const body = await readJsonBody(context);
  const fileName = pickString(body, 'fileName') || 'attachment';
  const mimeType = pickString(body, 'mimeType') || 'application/octet-stream';
  const caption = pickString(body, 'caption');
  const rawBase64 = pickString(body, 'base64');
  const declaredType = pickString(body, 'type');
  const size = typeof body.size === 'number' ? body.size : 0;

  logger.log(`[upload] start file=${fileName} mime=${mimeType} size=${size}`);

  if (!rawBase64) {
    return jsonResponse({ status: 'error', message: 'base64 is required' }, 400);
  }

  let buffer: Buffer;
  try {
    buffer = decodeBase64(rawBase64);
  } catch {
    return jsonResponse({ status: 'error', message: 'invalid base64' }, 400);
  }

  if (buffer.byteLength > MAX_BYTES) {
    return jsonResponse({ status: 'error', message: 'file is larger than 20 MB' }, 413);
  }

  const id = `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const type = declaredType || (mimeType.startsWith('image/') ? 'image' : 'file');
  let extractedText = '';
  let error = '';

  try {
    if (type !== 'image') {
      extractedText = await extractText(buffer, mimeType, fileName);
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    logger.error(`[upload] extraction failed for ${fileName}:`, e);
  }

  const summary = type === 'image'
    ? `${fileName}：图片已接收，可结合用户描述用于识别分子结构图、实验装置图或教材截图。`
    : extractedText
      ? summarizeText(extractedText)
      : `${fileName}：文件已接收，但未能提取到可用文本。`;

  logger.log(`[upload] end ${Date.now() - startTime}ms extracted=${extractedText.length}`);

  return jsonResponse({
    status: 'ok',
    id,
    type,
    fileName,
    mimeType,
    size: buffer.byteLength,
    caption,
    extractedText,
    summary,
    error: error || undefined,
  });
}
