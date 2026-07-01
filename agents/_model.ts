/**
 * Model config -- private module
 * 从 context.env 读取 LLM 配置
 */

export interface ModelConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function getModelConfig(env: Record<string, string | undefined>): ModelConfig {
  return {
    apiKey: env.AI_GATEWAY_API_KEY || env.DEEPSEEK_API_KEY || '',
    baseUrl: env.AI_GATEWAY_BASE_URL || env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    model: env.AI_GATEWAY_MODEL || env.DEEPSEEK_MODEL || 'deepseek-chat',
  };
}
