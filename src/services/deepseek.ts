// DeepSeek 客户端封装
import { createOpenAI } from '@ai-sdk/openai';

export function createDeepSeek() {
  return createOpenAI({
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
  });
}

export const deepseek = createDeepSeek();

export const MODEL_NAME = 'deepseek-chat';
