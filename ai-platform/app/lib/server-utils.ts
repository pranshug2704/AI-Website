import 'server-only';
import { AIModel } from '../types';
import { getCachedApiKeys } from '../api/keys/route';

// Get API keys with fallback to environment variables
function getApiKeys() {
  try {
    return getCachedApiKeys();
  } catch (error) {
    console.log('Using environment variables for API keys (cache not available)');
    return {
      openai: process.env.OPENAI_API_KEY || '',
      anthropic: process.env.ANTHROPIC_API_KEY || '',
      google: process.env.GOOGLE_API_KEY || '',
      mistral: process.env.MISTRAL_API_KEY || ''
    };
  }
}

// Utility function to check if provider is available on the server
export function isProviderAvailable(provider: string): boolean {
  const keys = getCachedApiKeys();
  
  switch (provider.toLowerCase()) {
    case 'openai':
      return !!keys.openai && keys.openai.length > 8;
    case 'anthropic':
      return !!keys.anthropic && keys.anthropic.length > 8;
    case 'google':
      return !!keys.google && keys.google.length > 8;
    case 'mistral':
      return !!keys.mistral && keys.mistral.length > 8;
    case 'ollama':
      // Check if Ollama is running by reading from environment or config
      return !!process.env.OLLAMA_URL || process.env.ENABLE_OLLAMA === 'true';
    default:
      return false;
  }
}

// Get all available providers on the server
export function getAvailableProviders(): string[] {
  // Get API keys
  const keys = getCachedApiKeys();
  const providers: string[] = [];
  
  // Check for OpenAI
  if (isProviderAvailable('openai')) {
    providers.push('openai');
  }
  
  // Check for Anthropic
  if (isProviderAvailable('anthropic')) {
    providers.push('anthropic');
  }
  
  // Check for Google
  if (isProviderAvailable('google')) {
    providers.push('google');
  }
  
  // Check for Mistral
  if (isProviderAvailable('mistral')) {
    providers.push('mistral');
  }
  
  // Check for Ollama (local models)
  if (isProviderAvailable('ollama')) {
    providers.push('ollama');
  }
  
  // Debug logging for API keys
  console.log('Server getAvailableProviders called. Available providers:', providers);
  console.log('Environment check - GOOGLE_API_KEY:', 
    keys.google ? 
    `Configured (length: ${keys.google.length})` : 
    'Missing');
  
  return providers;
}

// Determine the best model to use based on input and available providers
export function routeRequest(requestedModel?: string): string {
  // Get available providers
  const availableProviders = getAvailableProviders();
  console.log('Available providers in AI router:', availableProviders);
  
  // Check if the requested model's provider is available
  if (requestedModel) {
    console.log(`Requested model: ${requestedModel}`);
    
    if (
      (requestedModel.startsWith('gpt-') && isProviderAvailable('openai')) ||
      (requestedModel.startsWith('claude-') && isProviderAvailable('anthropic')) ||
      (requestedModel.startsWith('gemini-') && isProviderAvailable('google')) ||
      (requestedModel.startsWith('mistral-') && isProviderAvailable('mistral'))
    ) {
      console.log(`Requested model ${requestedModel} provider is available`);
      
      // Special case for Gemini Flash - ensure we use the correct model ID
      if (requestedModel === 'gemini-flash') {
        console.log('Converting gemini-flash to gemini-1.5-flash for API compatibility');
        return 'gemini-1.5-flash';
      }
      
      return requestedModel;
    } else {
      console.log(`Requested model ${requestedModel} provider is NOT available`);
    }
  }
  
  // Always prioritize Google if it's configured
  if (availableProviders.includes('google')) {
    console.log('Only Google API key is available - forcing use of Google model');
    
    // For free tier, use Gemini 1.5 Flash
    const userTier = process.env.USER_TIER || 'free';
    if (userTier === 'free') {
      console.log('Selected Google model: Gemini 1.5 Flash');
      return 'gemini-1.5-flash';
    } else {
      console.log('Selected Google model: Gemini Pro');
      return 'gemini-pro';
    }
  } else if (availableProviders.includes('openai')) {
    return 'gpt-3.5-turbo';
  } else if (availableProviders.includes('anthropic')) {
    return 'claude-3-haiku';
  } else if (availableProviders.includes('mistral')) {
    return 'mistral-large';
  }
  
  // If no provider available, return error
  throw new Error('No AI provider available. Please configure API keys in your environment.');
} 