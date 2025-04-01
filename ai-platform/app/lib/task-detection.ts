import { TaskType } from '../types';

/**
 * Detect the most likely task type from a prompt
 * Used for model routing
 */
export function detectTaskType(prompt: string): TaskType {
  const lowerPrompt = prompt.toLowerCase();
  
  // Check for code-related tasks
  if (
    lowerPrompt.includes('code') ||
    lowerPrompt.includes('program') ||
    lowerPrompt.includes('function') ||
    lowerPrompt.includes('algorithm') ||
    lowerPrompt.includes('implement') ||
    lowerPrompt.includes('debug') ||
    lowerPrompt.match(/\b(js|javascript|python|java|c\+\+|typescript|rust|go)\b/)
  ) {
    return 'code';
  }
  
  // Check for math-related tasks
  if (
    lowerPrompt.includes('math') ||
    lowerPrompt.includes('equation') ||
    lowerPrompt.includes('calculate') ||
    lowerPrompt.includes('solve') ||
    lowerPrompt.includes('compute')
  ) {
    return 'math';
  }
  
  // Check for creative tasks
  if (
    lowerPrompt.includes('story') ||
    lowerPrompt.includes('poem') ||
    lowerPrompt.includes('write') ||
    lowerPrompt.includes('creative') ||
    lowerPrompt.includes('fiction')
  ) {
    return 'creative';
  }
  
  // Default to general
  return 'general';
} 