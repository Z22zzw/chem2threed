// EdgeOne 部署封装
// 默认使用 mcporter 免登录方式（无需 Token / 无需登录）
// 可选使用 edgeone CLI 方式（需要 Token 或登录，但功能更完整）
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export interface DeployResult {
  success: boolean;
  url?: string;
  projectId?: string;
  method?: 'mcporter' | 'cli';
  error?: string;
}

export type DeployMethod = 'mcporter' | 'cli' | 'auto';

// 方式1：mcporter 免登录部署（默认）
// 调用 mcp-on-edge.edgeone.app 公共 MCP 服务，直接部署 HTML 内容
// 优点：无需登录、无需 Token、开箱即用
// 限制：只能部署单文件 HTML，返回临时 URL
async function deployWithMcporter(htmlContent: string): Promise<DeployResult> {
  // 将 HTML 写入临时文件，用 $(cat file) 形式传递避免命令行长度限制
  const tmpFile = path.join(process.cwd(), 'data', 'tmp-deploy.html');
  await fs.mkdir(path.dirname(tmpFile), { recursive: true });
  await fs.writeFile(tmpFile, htmlContent, 'utf-8');

  const cmd = `npx -y mcporter call mcp-on-edge.edgeone.app/mcp-server.deploy-html value="$(cat '${tmpFile.replace(/'/g, "'\\''")}')`;

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      env: { ...process.env },
      timeout: 120000,
      maxBuffer: 1024 * 1024 * 10,
      shell: 'bash',
    });

    const output = stdout + stderr;
    // 清理临时文件
    await fs.unlink(tmpFile).catch(() => {});

    // mcporter 返回中提取 URL
    // 常见格式：URL: https://xxx.edgeone.app 或 直接是 https 链接
    const urlMatch = output.match(/https:\/\/[^\s"'<>]+\.edgeone\.[^\s"'<>]+/i)
      || output.match(/https:\/\/[^\s"'<>]+\.edgeone\.app[^\s"'<>]*/i)
      || output.match(/https:\/\/[^\s"'<>]+/i);

    if (urlMatch) {
      return {
        success: true,
        url: urlMatch[0],
        method: 'mcporter',
      };
    }

    // 尝试 JSON 解析
    try {
      const jsonMatch = output.match(/\{[\s\S]*?"url"[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.url) {
          return { success: true, url: parsed.url, method: 'mcporter' };
        }
      }
    } catch {}

    return {
      success: false,
      method: 'mcporter',
      error: 'mcporter 部署完成但未能解析 URL。原始输出:\n' + output.slice(0, 800),
    };
  } catch (err: any) {
    await fs.unlink(tmpFile).catch(() => {});
    return {
      success: false,
      method: 'mcporter',
      error: err.message || 'mcporter 部署执行失败',
    };
  }
}

// 方式2：EdgeOne Pages CLI 部署（需要 Token 或登录）
// 功能完整：项目管理、自定义域名、构建配置等
async function deployWithCLI(htmlDir: string, projectName?: string): Promise<DeployResult> {
  const token = process.env.EDGEONE_TOKEN;

  const indexPath = path.join(htmlDir, 'index.html');
  try {
    await fs.access(indexPath);
  } catch {
    return { success: false, error: 'index.html 不存在于目录: ' + htmlDir };
  }

  const nameArg = projectName ? `-n ${projectName}` : '';
  const tokenArg = token ? `-t ${token}` : '';
  const cmd = `edgeone pages deploy "${htmlDir}" ${nameArg} ${tokenArg}`.trim();

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      env: { ...process.env, PAGES_SOURCE: 'skills' },
      timeout: 120000,
      maxBuffer: 1024 * 1024 * 10,
    });

    const output = stdout + stderr;
    const urlMatch = output.match(/EDGEONE_DEPLOY_URL=(\S+)/);
    const projectMatch = output.match(/EDGEONE_PROJECT_ID=(\S+)/);

    if (urlMatch) {
      return {
        success: true,
        url: urlMatch[1],
        projectId: projectMatch?.[1],
        method: 'cli',
      };
    }

    const httpsMatch = output.match(/https:\/\/[^\s]+\.edgeone\.[^\s]+/);
    if (httpsMatch) {
      return { success: true, url: httpsMatch[0], method: 'cli' };
    }

    return {
      success: false,
      method: 'cli',
      error: '部署完成但未能解析 URL。原始输出:\n' + output.slice(0, 500),
    };
  } catch (err: any) {
    return {
      success: false,
      method: 'cli',
      error: err.message || '部署执行失败',
    };
  }
}

// 主部署函数：默认 mcporter，可通过环境变量切换
// EDGEONE_DEPLOY_METHOD=mcporter|cli|auto (auto=优先 mcporter，失败回退 cli)
export async function deployToEdgeOne(
  htmlDir: string,
  htmlContent?: string,
  projectName?: string
): Promise<DeployResult> {
  const method: DeployMethod = (process.env.EDGEONE_DEPLOY_METHOD as DeployMethod) || 'auto';

  // 读取 HTML 内容（mcporter 需要）
  let content = htmlContent;
  if (!content) {
    try {
      content = await fs.readFile(path.join(htmlDir, 'index.html'), 'utf-8');
    } catch {
      return { success: false, error: '无法读取 index.html' };
    }
  }

  // auto 模式：优先 mcporter，失败则尝试 CLI
  if (method === 'mcporter') {
    return deployWithMcporter(content);
  } else if (method === 'cli') {
    return deployWithCLI(htmlDir, projectName);
  } else {
    // auto
    const mcporterResult = await deployWithMcporter(content);
    if (mcporterResult.success) return mcporterResult;

    // mcporter 失败，尝试 CLI（如果有 Token 或已登录）
    const hasToken = !!process.env.EDGEONE_TOKEN;
    if (hasToken) {
      const cliResult = await deployWithCLI(htmlDir, projectName);
      if (cliResult.success) return cliResult;
    }

    // 都失败，返回 mcporter 的错误
    return mcporterResult;
  }
}

// 检查 edgeone CLI 是否可用
export async function checkEdgeOneCLI(): Promise<{ available: boolean; version?: string }> {
  try {
    const { stdout } = await execAsync('edgeone -v', { env: { ...process.env, PAGES_SOURCE: 'skills' } });
    return { available: true, version: stdout.trim() };
  } catch {
    return { available: false };
  }
}

// 检查 mcporter 是否可用
export async function checkMcporter(): Promise<{ available: boolean }> {
  try {
    await execAsync('npx -y mcporter --version', { timeout: 30000 });
    return { available: true };
  } catch {
    return { available: false };
  }
}
