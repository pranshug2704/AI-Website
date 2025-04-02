import { AIModel, TaskType } from '../types';
// Remove server-only import
// import { isProviderAvailable } from './ai-api';

// Interface for model with availability information
interface AIModelWithAvailability extends AIModel {
  providerAvailable: boolean;
}

// Cache for available providers from the API
let availableProvidersCache: string[] = [];

// Export the models data
export const models: AIModel[] = [
  {
    id: 'gpt-3.5-turbo',
    name: 'ChatGPT 3.5',
    provider: 'OpenAI',
    capabilities: ['general', 'coding', 'summarization'],
    tier: 'free',
    maxTokens: 4096,
    description: 'Fast and cost-effective model for general tasks and coding assistance',
    icon: '/icons/openai.svg'
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    capabilities: ['general', 'coding', 'creative', 'analysis', 'summarization'],
    tier: 'pro',
    maxTokens: 8192,
    description: 'Advanced model with strong reasoning and creative capabilities',
    icon: '/icons/openai.svg'
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    capabilities: ['general', 'summarization'],
    tier: 'free',
    maxTokens: 100000,
    description: 'Fast, compact, and cost-effective model for general tasks',
    icon: '/icons/anthropic.svg'
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    capabilities: ['general', 'coding', 'creative', 'analysis', 'summarization'],
    tier: 'pro',
    maxTokens: 200000,
    description: 'Ideal balance of intelligence and speed for most tasks',
    icon: '/icons/anthropic.svg'
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    capabilities: ['general', 'coding', 'creative', 'analysis', 'summarization'],
    tier: 'enterprise',
    maxTokens: 200000,
    description: 'Most powerful model for complex reasoning and analysis',
    icon: '/icons/anthropic.svg'
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    capabilities: ['general', 'coding', 'creative', 'analysis', 'summarization'],
    tier: 'pro',
    maxTokens: 30000,
    description: 'Google\'s multimodal model with strong reasoning capabilities',
    icon: '/icons/google.svg'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'Google',
    capabilities: ['general', 'summarization'],
    tier: 'free',
    maxTokens: 16000,
    description: 'Fast and cost-effective model for general purpose tasks',
    icon: '/icons/google.svg'
  },
  {
    id: 'mistral-large',
    name: 'Mistral Large',
    provider: 'Mistral',
    capabilities: ['general', 'coding', 'analysis', 'summarization'],
    tier: 'pro',
    maxTokens: 32000,
    description: 'High-performance model with strong reasoning capabilities',
    icon: '/icons/mistral.svg'
  },
  // Add local Ollama models
  {
    id: 'ollama:llama3.1:latest',
    name: 'Llama 3.1 (Local)',
    provider: 'Ollama',
    capabilities: ['general', 'coding', 'creative', 'analysis', 'summarization'],
    tier: 'free',
    maxTokens: 8192,
    description: 'Locally hosted Llama 3.1 model - low latency with complete privacy',
    icon: '/icons/llama.svg'
  },
  {
    id: 'ollama:deepseek-r1:latest',
    name: 'DeepSeek-R1 (Local)',
    provider: 'Ollama',
    capabilities: ['general', 'coding', 'analysis'],
    tier: 'free',
    maxTokens: 8192,
    description: 'Locally hosted DeepSeek-R1 model - excellent for coding tasks',
    icon: '/icons/deepseek.svg'
  },
  {
    id: 'ollama:mistral',
    name: 'Mistral (Local)',
    provider: 'Ollama',
    capabilities: ['general', 'coding', 'analysis', 'summarization'],
    tier: 'free',
    maxTokens: 8192,
    description: 'Locally hosted Mistral model - great balance of performance and speed',
    icon: '/icons/mistral.svg'
  }
];

// Client-safe function to check if a provider is available
async function fetchAvailableProviders(): Promise<string[]> {
  if (availableProvidersCache.length > 0) {
    return availableProvidersCache;
  }

  try {
    const response = await fetch('/api/models/available');
    if (response.ok) {
      const data = await response.json();
      availableProvidersCache = data.providers || [];
      return availableProvidersCache;
    }
  } catch (error) {
    console.error('Error fetching available providers:', error);
  }
  
  return [];
}

// Set available providers - called from the server
export function setAvailableProviders(providers: string[]) {
  availableProvidersCache = providers.map(p => p.toLowerCase());
  console.log('Available providers cache updated:', availableProvidersCache);
}

// Get all available models for a user's tier
export function getAvailableModels(userTier: 'free' | 'pro' | 'enterprise'): AIModel[] {
  // Log what's happening to debug
  console.log(`Getting available models for tier: ${userTier}`);
  console.log(`Total models before filtering: ${models.length}`);
  console.log(`Available providers cache: ${availableProvidersCache.join(', ') || 'empty'}`);
  
  // Filter models by user tier
  let availableModels = models.filter(model => {
    if (userTier === 'enterprise') return true; // Enterprise users get access to all models
    if (userTier === 'pro') return model.tier === 'free' || model.tier === 'pro'; // Pro users get pro and free models
    return model.tier === 'free'; // Free users only get free models
  });
  
  console.log(`Models after tier filtering: ${availableModels.length}`);
  
  // Filter models by available providers (if cache is populated)
  if (availableProvidersCache.length > 0) {
    // First tag models with availability
    const modelsWithAvailability: AIModelWithAvailability[] = availableModels.map(model => ({
      ...model,
      // Add a property to indicate if the model's provider is available
      providerAvailable: availableProvidersCache.includes(model.provider.toLowerCase())
    }));
    
    console.log('Models with availability:');
    modelsWithAvailability.forEach(model => {
      console.log(`${model.name} (${model.provider}): ${model.providerAvailable ? 'Available' : 'Not available'}`);
    });
    
    // Sort models to prioritize those with available providers
    modelsWithAvailability.sort((a, b) => {
      if (a.providerAvailable && !b.providerAvailable) return -1;
      if (!a.providerAvailable && b.providerAvailable) return 1;
      return 0;
    });
    
    // Remove the custom property before returning
    availableModels = modelsWithAvailability.map(({ providerAvailable, ...cleanModel }) => cleanModel);
  }
  
  console.log(`Final available models: ${availableModels.length}`);
  console.log(`Model names: ${availableModels.map(m => m.name).join(', ')}`);
  
  return availableModels;
}

// Get models suitable for a specific task
export function getModelsForTask(taskType: TaskType, userTier: 'free' | 'pro' | 'enterprise'): AIModel[] {
  const availableModels = getAvailableModels(userTier);
  return availableModels.filter(model => model.capabilities.includes(taskType));
}

// Get model by ID
export function getModelById(modelId: string): AIModel | undefined {
  return models.find(model => model.id === modelId);
}

// Detect task type from prompt
export function detectTaskType(prompt: string): TaskType {
  const promptLower = prompt.toLowerCase();
  
  // Check for code-related keywords
  const codeKeywords = ['code', 'function', 'program', 'javascript', 'python', 'algorithm', 'html', 'css', 'api'];
  if (codeKeywords.some(keyword => promptLower.includes(keyword))) {
    return 'coding';
  }
  
  // Check for creative writing keywords
  const creativeKeywords = ['write', 'story', 'poem', 'creative', 'fiction', 'novel', 'essay'];
  if (creativeKeywords.some(keyword => promptLower.includes(keyword))) {
    return 'creative';
  }
  
  // Check for analysis keywords
  const analysisKeywords = ['analyze', 'analysis', 'research', 'study', 'examine', 'evaluate', 'report'];
  if (analysisKeywords.some(keyword => promptLower.includes(keyword))) {
    return 'analysis';
  }
  
  // Check for summarization keywords
  const summaryKeywords = ['summarize', 'summary', 'shorten', 'brief', 'condense', 'tldr'];
  if (summaryKeywords.some(keyword => promptLower.includes(keyword))) {
    return 'summarization';
  }
  
  // Default to general
  return 'general';
}