// Hono 服务入口
import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import chatApi from './api/chat.js';
import uploadApi from './api/upload.js';
import previewApi from './api/preview.js';
import historyApi from './api/history.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 兼容本地开发（src/web）和生产构建（dist/ 同级的 src/web）
// tsup 打包后 dist/index.js 运行时，src/web 仍在项目根目录
function findWebDir(): string {
  const candidates = [
    path.join(__dirname, 'web'),           // 开发模式：src/web
    path.join(__dirname, '..', 'src', 'web'), // 生产模式：dist/../src/web
    path.join(__dirname, '..', 'web'),     // 备选
    path.join(process.cwd(), 'src', 'web'), // 工作目录
    path.join(process.cwd(), 'web'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(path.join(p, 'index.html'))) return p;
  }
  return candidates[0];
}

const webDir = findWebDir();

const app = new Hono();

// API 路由
app.route('/api/chat', chatApi);
app.route('/api/upload', uploadApi);
app.route('/api/preview', previewApi);
app.route('/api/history', historyApi);

// 健康检查
app.get('/api/health', (c) => c.json({
  status: 'ok',
  time: new Date().toISOString(),
  deployMethod: process.env.EDGEONE_DEPLOY_METHOD || 'auto',
}));

// 静态文件 - Web 控制台
app.use('/style.css', serveStatic({ root: path.relative(process.cwd(), webDir) || '.' }));
app.use('/app.js', serveStatic({ root: path.relative(process.cwd(), webDir) || '.' }));
app.get('/', (c) => {
  const htmlPath = path.join(webDir, 'index.html');
  return c.body(
    fs.readFileSync(htmlPath, 'utf-8'),
    200,
    { 'Content-Type': 'text/html; charset=utf-8' }
  );
});

// 404
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// 错误处理
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: err.message || 'Internal Server Error' }, 500);
});

// Makers 平台会自动注入 PORT；本地默认 3000
const port = parseInt(process.env.PORT || '3000', 10);

serve({
  fetch: app.fetch,
  port,
});

console.log(`\n  ChemScene Agent 已启动`);
console.log(`  访问地址: http://localhost:${port}`);
console.log(`  环境: ${process.env.NODE_ENV || 'development'}`);
console.log(`  DeepSeek API: ${process.env.DEEPSEEK_API_KEY ? '已配置' : '未配置（请设置 DEEPSEEK_API_KEY）'}`);
console.log(`  部署方式: ${process.env.EDGEONE_DEPLOY_METHOD || 'auto（mcporter 免登录优先）'}`);
console.log(`  Web 资源目录: ${webDir}\n`);
