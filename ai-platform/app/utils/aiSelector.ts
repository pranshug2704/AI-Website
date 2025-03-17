import { AIModel, AIRequest, SubscriptionTier } from '../types';

// Example AI models that would be available in the platform
const availableModels: AIModel[] = [
  {
    id: 'model-1',
    name: 'Basic Text',
    provider: 'OpenAI',
    capabilities: ['text generation', 'summarization'],
    tier: 'free'
  },
  {
    id: 'model-2',
    name: 'Advanced Text',
    provider: 'Anthropic',
    capabilities: ['text generation', 'summarization', 'creative writing'],
    tier: 'pro'
  },
  {
    id: 'model-3',
    name: 'Code Assistant',
    provider: 'CodeX',
    capabilities: ['code generation', 'code explanation', 'debugging'],
    tier: 'pro'
  },
  {
    id: 'model-4',
    name: 'Enterprise Text',
    provider: 'GPT Corp',
    capabilities: ['text generation', 'summarization', 'creative writing', 'research'],
    tier: 'enterprise'
  },
  {
    id: 'model-5',
    name: 'Enterprise Code',
    provider: 'CodeX Pro',
    capabilities: ['code generation', 'code explanation', 'debugging', 'optimization'],
    tier: 'enterprise'
  }
];

/**
 * Selects the most appropriate AI model based on user's subscription tier,
 * request content, and any specific model preferences.
 */
export function selectBestModel(
  request: AIRequest, 
  userTier: SubscriptionTier
): AIModel {
  // Filter models available to the user based on their subscription tier
  let eligibleModels = availableModels.filter(model => {
    if (userTier === 'enterprise') return true;
    if (userTier === 'pro') return model.tier !== 'enterprise';
    return model.tier === 'free';
  });
  
  // If user specified a model preference, try to honor it
  if (request.modelPreference) {
    const preferredModel = eligibleModels.find(
      model => model.id === request.modelPreference || 
               model.name.toLowerCase() === request.modelPreference?.toLowerCase()
    );
    if (preferredModel) return preferredModel;
  }
  
  // Simple content-based routing logic (would be more sophisticated in a real implementation)
  const promptLower = request.prompt.toLowerCase();
  
  // Check if this appears to be a code-related request
  const codeKeywords = ['function', 'code', 'programming', 'algorithm', 'bug', 'debug'];
  const isCodeRequest = codeKeywords.some(keyword => promptLower.includes(keyword));
  
  if (isCodeRequest) {
    // Find the best available code model for this user's tier
    const codeModel = eligibleModels.find(model => 
      model.capabilities.includes('code generation')
    );
    if (codeModel) return codeModel;
  }
  
  // Default to the most capable text model available for this user's tier
  return eligibleModels[0];
}

/**
 * This is a placeholder function that would make an actual API call to an AI model
 * In a real implementation, this would call the specific provider's API
 */
export async function processAIRequest(request: AIRequest, userTier: SubscriptionTier) {
  const selectedModel = selectBestModel(request, userTier);
  
  // This would be an actual API call in a real implementation
  console.log(`Processing request with model: ${selectedModel.name}`);
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    id: `req-${Date.now()}`,
    result: `This is a simulated response from ${selectedModel.name} by ${selectedModel.provider}.`,
    modelUsed: selectedModel.name,
    usage: {
      promptTokens: Math.floor(request.prompt.length / 4),
      completionTokens: 150,
      totalTokens: Math.floor(request.prompt.length / 4) + 150
    },
    createdAt: new Date().toISOString()
  };
}