import { AIModel, AIRequest, AIProvider, TaskType, SubscriptionTier, Message } from '../types';
import { getAvailableModels, getModelsForTask, detectTaskType, getModelById, setAvailableProviders } from './models';
import { getAvailableProviders, isProviderAvailable, routeRequest } from './server-utils';
import { getCachedApiKeys } from '../api/keys/route';
import { 
  streamOpenAI, 
  streamAnthropic, 
  streamGoogle, 
  streamMistral 
} from "./ai-api";

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
  images?: any[]; // Add support for images
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

// Helper function to check if a provider has a valid API key
function hasValidApiKey(provider: string): boolean {
  try {
    const keys = getCachedApiKeys();
    switch (provider.toLowerCase()) {
      case 'openai':
        return !!keys.openai && keys.openai.length > 20;
      case 'anthropic':
        return !!keys.anthropic && keys.anthropic.length > 20;
      case 'google':
        return !!keys.google && keys.google.length >= 30;
      case 'mistral': 
        return !!keys.mistral && keys.mistral.length > 20;
      default:
        return false;
    }
  } catch (error) {
    // Fall back to provider availability check
    return isProviderAvailable(provider);
  }
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
  
  // Get list of providers with API keys configured
  const availableProviders = getAvailableProviders();
  console.log('Available providers in AI router:', availableProviders);
  
  // CRITICAL FIX: If Google is the only available provider, force use of a Google model
  if (availableProviders.length === 1 && availableProviders[0] === 'google') {
    console.log('Only Google API key is available - forcing use of Google model');
    // Find an eligible Google model
    const googleModels = eligibleModels.filter(model => 
      model.provider.toLowerCase() === 'google'
    );
    
    if (googleModels.length > 0) {
      // Use the first Google model available for this tier
      const selectedModel = googleModels[0];
      console.log(`Selected Google model: ${selectedModel.name}`);
      
      return { selectedModel, taskType };
    }
  }
  
  // Tag models with their provider availability
  let modelsWithAvailability = eligibleModels.map(model => ({
    model,
    hasApiKey: availableProviders.includes(model.provider.toLowerCase())
  }));
  
  // If there's a preferred model and it's available, use it
  if (preferredModelId) {
    const preferredModelWithAvailability = modelsWithAvailability.find(m => m.model.id === preferredModelId);
    if (preferredModelWithAvailability) {
      const preferredModel = preferredModelWithAvailability.model;
      
      // Warn if the model's provider doesn't have an API key
      if (!preferredModelWithAvailability.hasApiKey) {
        console.warn(`Selected model ${preferredModel.name} uses provider ${preferredModel.provider} which has no API key configured.`);
      }
      
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
    const providerModelsWithAvailability = modelsWithAvailability.filter(m => 
      m.model.provider.toLowerCase() === preferredProvider.toLowerCase()
    );
    if (providerModelsWithAvailability.length > 0) {
      modelsWithAvailability = providerModelsWithAvailability;
    }
  }
  
  // Prioritize models with available API keys
  const sortedModels = [...modelsWithAvailability].sort((a, b) => {
    // First sort by API key availability - this is the most important factor
    if (a.hasApiKey && !b.hasApiKey) return -1;
    if (!a.hasApiKey && b.hasApiKey) return 1;
    
    // If both have or don't have API keys, then sort by tier
    const tierValue = { 'enterprise': 3, 'pro': 2, 'free': 1 };
    return (tierValue[b.model.tier] || 0) - (tierValue[a.model.tier] || 0);
  });
  
  // Debug the sorted models
  console.log(`Sorted models: ${sortedModels.map(m => `${m.model.name} (${m.model.provider}, key: ${m.hasApiKey ? '✓' : '✗'})`).join(', ')}`);
  
  // Get the best model based on the sorted list
  const bestModelWithAvailability = sortedModels[0];
  
  // If no API key is available for the best model, look for any model with an API key
  if (bestModelWithAvailability && !bestModelWithAvailability.hasApiKey) {
    const modelWithApiKey = sortedModels.find(m => m.hasApiKey);
    if (modelWithApiKey) {
      console.log(`Selecting model ${modelWithApiKey.model.name} because it has a configured API key`);
      return { 
        selectedModel: modelWithApiKey.model, 
        taskType 
      };
    }
  }
  
  if (!bestModelWithAvailability) {
    throw new Error('No suitable AI model found for the request.');
  }
  
  const selectedModel = bestModelWithAvailability.model;
  
  // Warn if the selected model's provider doesn't have an API key
  if (!bestModelWithAvailability.hasApiKey) {
    console.warn(`Selected model ${selectedModel.name} uses provider ${selectedModel.provider} which has no API key configured.`);
  }
  
  // Check if prompt needs to be segmented
  if (isPromptTooLarge(prompt, selectedModel)) {
    return {
      selectedModel,
      segmentedPrompts: segmentPrompt(prompt, (selectedModel.maxTokens || 4000) / 2),
      taskType
    };
  }
  
  return { selectedModel, taskType };
}

// Define a type for the callback functions
type UpdateCallback = (chunk: string) => void;
type CompleteCallback = (finalOutput: string) => void;
type ErrorCallback = (error: Error) => void;

// Get stream function based on provider
function getStreamFunction(provider: string) {
  switch (provider.toLowerCase()) {
    case 'openai':
      return streamOpenAI;
    case 'anthropic':
      return streamAnthropic;
    case 'google':
      return streamGoogle;
    case 'mistral':
      return streamMistral;
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// Determine provider from model ID
function getProviderFromModelId(modelId: string): string {
  if (modelId.startsWith('gpt-')) return 'openai';
  if (modelId.startsWith('claude-')) return 'anthropic';
  if (modelId.startsWith('gemini-')) return 'google';
  if (modelId.startsWith('mistral-')) return 'mistral';
  throw new Error(`Unknown model provider for ${modelId}`);
}

// Fix model ID for specific providers if needed
function getCompatibleModelId(modelId: string): string {
  // Handle special cases for model IDs that need to be adjusted for API compatibility
  if (modelId === 'gemini-flash') {
    console.log('Converting gemini-flash to gemini-1.5-flash for API compatibility');
    return 'gemini-1.5-flash';
  }
  return modelId;
}

// Stream AI response from the appropriate provider
export async function streamAIResponse({
  messages,
  model,
  onUpdate,
  onComplete,
  onError,
  temperature = 0.7
}: {
  messages: Message[];
  model: AIModel;
  onUpdate: UpdateCallback;
  onComplete: CompleteCallback;
  onError: ErrorCallback;
  temperature?: number;
}) {
  try {
    // Get available providers first
    const availableProviders = getAvailableProviders();
    
    // Set cache for client-side components
    setAvailableProviders(availableProviders);
    
    // Get model ID, using routeRequest to handle auto-selection and availability
    let modelId = model?.id || 'auto-select';
    
    if (modelId === 'auto-select') {
      modelId = routeRequest();
    } else {
      // Check if the selected model's provider is available
      const provider = getProviderFromModelId(modelId);
      if (!availableProviders.includes(provider.toLowerCase())) {
        console.log(`Provider ${provider} for model ${modelId} is not available. Using auto-select.`);
        modelId = routeRequest();
      }
    }
    
    // Ensure model ID is compatible with provider API
    modelId = getCompatibleModelId(modelId);
    
    console.log(`Streaming AI response for model: ${modelId}`);
    
    // Get the right stream function based on the model ID
    const provider = getProviderFromModelId(modelId);
    const streamFunction = getStreamFunction(provider);
    
    let completeResponse = '';
    const stream = streamFunction(messages, modelId, temperature);
    
    for await (const chunk of stream) {
      completeResponse += chunk;
      onUpdate(chunk);
    }
    
    onComplete(completeResponse);
    
    return completeResponse;
  } catch (error) {
    console.error('Streaming error:', error);
    onError(error as Error);
    throw error;
  }
}