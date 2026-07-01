// 模板注册表和匹配器
import type { SceneTemplate, ParsedInput } from '../types.js';
import { moleculeTemplate } from './molecule.js';
import { reactionTemplate } from './reaction.js';
import { crystalTemplate } from './crystal.js';

export const templates: SceneTemplate[] = [
  moleculeTemplate,
  reactionTemplate,
  crystalTemplate,
];

export function getTemplate(id: string): SceneTemplate | undefined {
  return templates.find(t => t.id === id);
}

export function matchTemplate(parsedInput: ParsedInput): SceneTemplate {
  const text = (parsedInput.modelingObject + ' ' + parsedInput.knowledgePoint + ' ' + parsedInput.rawText).toLowerCase();

  let bestMatch: SceneTemplate | null = null;
  let bestScore = 0;

  for (const template of templates) {
    let score = 0;
    for (const keyword of template.applicableKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += keyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  }

  return bestMatch ?? templates[0];
}

export function listTemplates(): Array<{ id: string; name: string; description: string }> {
  return templates.map(t => ({ id: t.id, name: t.name, description: t.description }));
}
