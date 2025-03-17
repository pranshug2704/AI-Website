import 'server-only';
import { AIModel } from '../types';

// Utility function to check if provider is available on the server
export function isProviderAvailable(provider: string): boolean {
  switch (provider.toLowerCase()) {
    case 'openai':
      return !!process.env.OPENAI_API_KEY;
    case 'anthropic':
      return !!process.env.ANTHROPIC_API_KEY;
    case 'google':
      return !!process.env.GOOGLE_API_KEY;
    case 'mistral':
      return !!process.env.MISTRAL_API_KEY;
    default:
      return false;
  }
}

// Get all available providers on the server
export function getAvailableProviders(): string[] {
  const allProviders = ['openai', 'anthropic', 'google', 'mistral'];
  return allProviders.filter(provider => isProviderAvailable(provider));
}

// Determine the best model to use based on input and available providers
export function routeRequest(requestedModel?: string): string {
  // Check if the requested model's provider is available
  if (requestedModel) {
    if (
      (requestedModel.startsWith('gpt-') && isProviderAvailable('openai')) ||
      (requestedModel.startsWith('claude-') && isProviderAvailable('anthropic')) ||
      (requestedModel.startsWith('gemini-') && isProviderAvailable('google')) ||
      (requestedModel.startsWith('mistral-') && isProviderAvailable('mistral'))
    ) {
      return requestedModel;
    }
  }
  
  // Find the first available provider and return its model
  const availableProviders = getAvailableProviders();
  
  if (availableProviders.includes('google')) {
    return 'gemini-pro';
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