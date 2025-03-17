import { AIModel, AIRequest, AIProvider, TaskType, SubscriptionTier } from '../types';
import { getAvailableModels, getModelsForTask, detectTaskType } from './models';

/**
 * The AI Router is responsible for selecting the most appropriate AI model
 * based on the prompt content, user subscription, and other factors.
 * 
 * This is a key component of the platform as it enables intelligent distribution
 * of workloads across different AI models.
 */

interface RouterInput {
  prompt: string;
  userTier: SubscriptionTier;
  preferredModelId?: string;
  preferredProvider?: AIProvider;
  taskType?: TaskType;
}

interface RouterOutput {
  selectedModel: AIModel;
  segmentedPrompts?: string[];
  taskType: TaskType;
}

/**
 * Determines if a prompt exceeds the token limit for a model
 * Uses a simple approximation of 4 characters per token on average
 */
function isPromptTooLarge(prompt: string, model: AIModel): boolean {
  // Simple approximation: 4 characters = 1 token on average
  const estimatedTokens = Math.ceil(prompt.length / 4);
  return estimatedTokens > (model.maxTokens || 4000) / 2; // Use half of max tokens as limit for prompt
}

/**
 * Segment a prompt into smaller chunks if it's too large for a single request
 */
function segmentPrompt(prompt: string, maxTokens: number): string[] {
  // Simple approximation: 4 characters = 1 token on average
  const maxChars = maxTokens * 4;
  
  // If the prompt fits, return it as is
  if (prompt.length <= maxChars) {
    return [prompt];
  }
  
  // Otherwise, split it into paragraphs and group them
  const paragraphs = prompt.split('\n\n');
  const segments: string[] = [];
  let currentSegment = '';
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed the limit, start a new segment
    if (currentSegment.length + paragraph.length + 2 > maxChars) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = paragraph;
      } else {
        // If the paragraph itself is too long, split it by sentences
        const sentences = paragraph.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          if (currentSegment.length + sentence.length + 1 > maxChars) {
            segments.push(currentSegment);
            currentSegment = sentence;
          } else {
            currentSegment += (currentSegment.length ? ' ' : '') + sentence;
          }
        }
      }
    } else {
      currentSegment += (currentSegment.length ? '\n\n' : '') + paragraph;
    }
  }
  
  // Add the last segment if not empty
  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }
  
  return segments;
}

/**
 * Selects the most appropriate AI model based on input parameters
 */
export function routeAIRequest(input: RouterInput): RouterOutput {
  const { prompt, userTier, preferredModelId, preferredProvider, taskType: specifiedTaskType } = input;
  
  // Determine task type - use specified type or detect from prompt
  const taskType = specifiedTaskType || detectTaskType(prompt);
  
  // Get available models for the user's subscription tier and task type
  let eligibleModels = getModelsForTask(taskType, userTier);
  
  // If no task-specific models, fall back to all available models
  if (eligibleModels.length === 0) {
    eligibleModels = getAvailableModels(userTier);
  }
  
  // If there's a preferred model and it's available, use it
  if (preferredModelId) {
    const preferredModel = eligibleModels.find(model => model.id === preferredModelId);
    if (preferredModel) {
      // Check if prompt needs to be segmented
      if (isPromptTooLarge(prompt, preferredModel)) {
        return {
          selectedModel: preferredModel,
          segmentedPrompts: segmentPrompt(prompt, (preferredModel.maxTokens || 4000) / 2),
          taskType
        };
      }
      return { selectedModel: preferredModel, taskType };
    }
  }
  
  // If there's a preferred provider, filter by it
  if (preferredProvider) {
    const providerModels = eligibleModels.filter(model => 
      model.provider.toLowerCase() === preferredProvider.toLowerCase()
    );
    if (providerModels.length > 0) {
      eligibleModels = providerModels;
    }
  }
  
  // Select the most appropriate model based on task and tier
  // Strategy: Pick the highest-capability model available for the task
  // For enterprise and pro users, prefer more advanced models
  if (userTier === 'enterprise' || userTier === 'pro') {
    // First try to find an enterprise model
    const enterpriseModel = eligibleModels.find(model => model.tier === 'enterprise');
    if (enterpriseModel) {
      // Check if prompt needs to be segmented
      if (isPromptTooLarge(prompt, enterpriseModel)) {
        return {
          selectedModel: enterpriseModel,
          segmentedPrompts: segmentPrompt(prompt, (enterpriseModel.maxTokens || 4000) / 2),
          taskType
        };
      }
      return { selectedModel: enterpriseModel, taskType };
    }
    
    // Then try to find a pro model
    const proModel = eligibleModels.find(model => model.tier === 'pro');
    if (proModel) {
      // Check if prompt needs to be segmented
      if (isPromptTooLarge(prompt, proModel)) {
        return {
          selectedModel: proModel,
          segmentedPrompts: segmentPrompt(prompt, (proModel.maxTokens || 4000) / 2),
          taskType
        };
      }
      return { selectedModel: proModel, taskType };
    }
  }
  
  // Default to the first available model (which will be a free model for free users)
  const defaultModel = eligibleModels[0];
  
  // Check if prompt needs to be segmented
  if (isPromptTooLarge(prompt, defaultModel)) {
    return {
      selectedModel: defaultModel,
      segmentedPrompts: segmentPrompt(prompt, (defaultModel.maxTokens || 4000) / 2),
      taskType
    };
  }
  
  return { selectedModel: defaultModel, taskType };
}