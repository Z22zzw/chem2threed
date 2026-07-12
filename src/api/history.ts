// 历史记录接口
import { Hono } from 'hono';
import { getHistory } from '../services/storage.js';

const app = new Hono();

app.get('/', async (c) => {
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const history = await getHistory(limit);
  return c.json({ history });
});

export default app;
