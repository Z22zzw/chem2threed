// 预览接口 - 返回生成的 HTML
import { Hono } from 'hono';
import { getGeneratedHtml } from '../services/storage.js';

const app = new Hono();

app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const html = await getGeneratedHtml(id);
  if (!html) {
    return c.text('页面不存在或已过期', 404);
  }
  return c.html(html);
});

export default app;
