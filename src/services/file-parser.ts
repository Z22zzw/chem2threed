// 文件解析 - 从 PDF/TXT/DOCX 提取文本
import fs from 'fs/promises';
import path from 'path';

export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.txt':
    case '.md':
      return await fs.readFile(filePath, 'utf-8');

    case '.json':
      const json = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      return JSON.stringify(json, null, 2);

    case '.pdf':
      // PDF 解析需要 pdfplumber（Python）或 pdf-parse（Node）
      // 这里用简单的文本提取兜底，复杂 PDF 在 API 层调用 Python
      return await extractPdfText(filePath);

    case '.docx':
      return await extractDocxText(filePath);

    case '.csv':
      return await fs.readFile(filePath, 'utf-8');

    default:
      // 尝试当文本读
      try {
        return await fs.readFile(filePath, 'utf-8');
      } catch {
        return `[不支持的文件格式: ${ext}]`;
      }
  }
}

async function extractPdfText(filePath: string): Promise<string> {
  // 使用系统 Python + pdfplumber 提取
  const pythonPath = 'C:/Users/ZhengW/.workbuddy/binaries/python/versions/3.13.12/python.exe';
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    const script = `
import pdfplumber, sys
with pdfplumber.open(sys.argv[1]) as pdf:
    for page in pdf.pages:
        t = page.extract_text()
        if t: print(t)
`;
    const { stdout } = await execAsync(`"${pythonPath}" -c "${script.replace(/"/g, '\\"')}" "${filePath}"`, {
      timeout: 30000,
      maxBuffer: 1024 * 1024 * 5,
    });
    return stdout || '[PDF 无可提取文本]';
  } catch {
    return '[PDF 解析失败，请确认 pdfplumber 已安装]';
  }
}

async function extractDocxText(filePath: string): Promise<string> {
  // DOCX 是 zip，document.xml 里有文本
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    const { stdout } = await execAsync(
      `powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; $z=[System.IO.Compression.ZipFile]::OpenRead('${filePath.replace(/'/g, "''")}'); $e=$z.Entries | Where-Object {$_.FullName -eq 'word/document.xml'}; $s=New-Object System.IO.StreamReader($e.Open()); $x=$s.ReadToEnd(); $s.Close(); $z.Dispose(); [regex]::Replace($x,'<[^>]+>',' ')"`,
      { timeout: 30000, maxBuffer: 1024 * 1024 * 5 }
    );
    return stdout.trim() || '[DOCX 无文本]';
  } catch {
    return '[DOCX 解析失败]';
  }
}

export function isImageFile(filename: string): boolean {
  return /\.(png|jpg|jpeg|gif|bmp|webp)$/i.test(filename);
}

export function isSupportedFile(filename: string): boolean {
  return /\.(txt|md|json|pdf|docx|csv|png|jpg|jpeg|gif|bmp|webp)$/i.test(filename);
}
