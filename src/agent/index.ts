// Agent 主循环
import { streamText, type CoreMessage } from 'ai';
import { deepseek, MODEL_NAME } from '../services/deepseek.js';
import { allTools } from './tools.js';
import { SYSTEM_PROMPT } from './prompts.js';

export interface AgentRunOptions {
  messages: CoreMessage[];
  onToolCall?: (toolName: string, args: any) => void;
  onToolResult?: (toolName: string, result: any) => void;
}

export function runAgent(messages: CoreMessage[]) {
  const result = streamText({
    model: deepseek(MODEL_NAME),
    system: SYSTEM_PROMPT,
    messages,
    tools: allTools,
    maxSteps: 8,
    temperature: 0.7,
  });
  return result;
}

// 非流式版本，用于需要完整结果的场景
export async function runAgentSync(messages: CoreMessage[]) {
  const { generateText } = await import('ai');
  const result = await generateText({
    model: deepseek(MODEL_NAME),
    system: SYSTEM_PROMPT,
    messages,
    tools: allTools,
    maxSteps: 8,
    temperature: 0.7,
  });
  return result;
}
