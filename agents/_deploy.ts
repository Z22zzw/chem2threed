/**
 * Deploy helper -- private module
 * 使用 mcporter 免登录方式部署 HTML 到 EdgeOne
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export interface DeployResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function deployHtml(htmlContent: string): Promise<DeployResult> {
  // 写入临时文件
  const tmpDir = path.join('/tmp', 'chemscene-deploy');
  await fs.mkdir(tmpDir, { recursive: true }).catch(() => {});
  const tmpFile = path.join(tmpDir, `deploy-${Date.now()}.html`);
  await fs.writeFile(tmpFile, htmlContent, 'utf-8').catch(() => {
    // /tmp 可能不可写，尝试当前目录
    return fs.writeFile(path.join(process.cwd(), 'tmp-deploy.html'), htmlContent, 'utf-8');
  });

  const actualPath = (await fs.access(tmpFile).then(() => tmpFile).catch(() => path.join(process.cwd(), 'tmp-deploy.html')));

  const cmd = `npx -y mcporter call mcp-on-edge.edgeone.app/mcp-server.deploy-html value="$(cat '${actualPath.replace(/'/g, "'\\''")}')`;

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      env: { ...process.env },
      timeout: 120000,
      maxBuffer: 1024 * 1024 * 10,
      shell: 'bash',
    });

    const output = stdout + stderr;
    await fs.unlink(actualPath).catch(() => {});

    // 提取 URL
    const urlMatch = output.match(/https:\/\/[^\s"'<>]+\.edgeone\.[^\s"'<>]+/i)
      || output.match(/https:\/\/[^\s"'<>]+/i);

    if (urlMatch) {
      return { success: true, url: urlMatch[0] };
    }

    try {
      const jsonMatch = output.match(/\{[\s\S]*?"url"[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.url) return { success: true, url: parsed.url };
      }
    } catch {}

    return { success: false, error: '部署完成但未能解析URL。输出:\n' + output.slice(0, 500) };
  } catch (err: any) {
    await fs.unlink(actualPath).catch(() => {});
    return { success: false, error: err.message || '部署失败' };
  }
}
