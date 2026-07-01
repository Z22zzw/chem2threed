// 历史记录存储 - JSONL 格式
import fs from 'fs/promises';
import path from 'path';
import type { HistoryEntry } from '../types/index.js';

const HISTORY_FILE = path.join(process.cwd(), 'data', 'history.jsonl');

export async function appendHistory(entry: HistoryEntry): Promise<void> {
  await fs.mkdir(path.dirname(HISTORY_FILE), { recursive: true });
  await fs.appendFile(HISTORY_FILE, JSON.stringify(entry) + '\n', 'utf-8');
}

export async function getHistory(limit = 20): Promise<HistoryEntry[]> {
  try {
    const content = await fs.readFile(HISTORY_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const entries = lines.map(line => {
      try { return JSON.parse(line) as HistoryEntry; }
      catch { return null; }
    }).filter(Boolean) as HistoryEntry[];
    return entries.slice(-limit).reverse();
  } catch {
    return [];
  }
}

// 保存生成的 HTML 文件
const GENERATED_DIR = path.join(process.cwd(), 'generated');

export async function saveGeneratedHtml(html: string, id: string): Promise<string> {
  const dir = path.join(GENERATED_DIR, id);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, 'index.html');
  await fs.writeFile(filePath, html, 'utf-8');
  return dir; // 返回目录路径用于部署
}

export async function getGeneratedHtml(id: string): Promise<string | null> {
  try {
    const filePath = path.join(GENERATED_DIR, id, 'index.html');
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}
