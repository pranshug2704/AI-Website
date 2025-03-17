import { AIModel, TaskType } from '../types';
// Remove server-only import
// import { isProviderAvailable } from './ai-api';

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
    id: 'mistral-large',
    name: 'Mistral Large',
    provider: 'Mistral',
    capabilities: ['general', 'coding', 'analysis', 'summarization'],
    tier: 'pro',
    maxTokens: 32000,
    description: 'High-performance model with strong reasoning capabilities',
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

// Set cache directly - useful for SSR or when we already know the available providers
export function setAvailableProviders(providers: string[]): void {
  availableProvidersCache = providers;
}

// Get available models based on user subscription tier
export function getAvailableModels(userTier: 'free' | 'pro' | 'enterprise'): AIModel[] {
  // Filter models based on subscription tier
  let availableModels = models.filter(model => {
    const tierLevel = { 'free': 1, 'pro': 2, 'enterprise': 3 };
    const modelTierLevel = tierLevel[model.tier];
    const userTierLevel = tierLevel[userTier];
    
    return modelTierLevel <= userTierLevel;
  });
  
  // Filter based on cached provider availability
  // We don't do async filtering here to keep this function synchronous
  if (availableProvidersCache.length > 0) {
    availableModels = availableModels.filter(model => 
      availableProvidersCache.includes(model.provider.toLowerCase())
    );
  }
  
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