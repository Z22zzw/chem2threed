// 文件上传接口
import { Hono } from 'hono';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import { extractTextFromFile, isSupportedFile } from '../services/file-parser.js';

const app = new Hono();

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');

app.post('/', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return c.json({ error: '未提供文件' }, 400);
    }

    if (!isSupportedFile(file.name)) {
      return c.json({ error: '不支持的文件格式。支持: txt, md, json, pdf, docx, csv, png, jpg, jpeg, gif, bmp, webp' }, 400);
    }

    // 保存文件
    await mkdir(UPLOAD_DIR, { recursive: true });
    const id = nanoid(10);
    const ext = path.extname(file.name);
    const filename = `${id}${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    const buffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(buffer));

    // 提取文本
    let extractedText: string | undefined;
    try {
      extractedText = await extractTextFromFile(filePath);
    } catch {
      // 图片或解析失败，不影响上传
    }

    return c.json({
      path: filePath,
      filename: file.name,
      size: file.size,
      extractedText: extractedText?.slice(0, 8000), // 限制长度避免 token 爆炸
    });
  } catch (err: any) {
    return c.json({ error: err.message || '上传失败' }, 500);
  }
});

export default app;
