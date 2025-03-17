import { User } from '../types';

// Calculate token count from text
// This is a simple approximation - in a real app, you would use a tokenizer library
export function estimateTokenCount(text: string): number {
  // Rough estimate: 1 token = 4 characters
  return Math.ceil(text.length / 4);
}

// Format token count for display
export function formatTokenCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  }
  if (count < 1000000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return `${(count / 1000000).toFixed(1)}M`;
}

// Calculate the percentage of token usage
export function calculateUsagePercentage(user: User): number {
  if (!user) return 0;
  
  // Handle both mock auth and real auth user structures
  if ('usage' in user && user.usage && typeof user.usage === 'object') {
    // Mock auth structure with user.usage object
    return (user.usage.totalTokens / user.usage.limit) * 100;
  } else if ('usageTotal' in user && 'usageLimit' in user) {
    // Real auth structure with database fields
    return (user.usageTotal / user.usageLimit) * 100;
  }
  
  return 0;
}

// Get appropriate color for token usage display based on percentage
export function getUsageColor(percentage: number): string {
  if (percentage < 50) return 'text-green-500';
  if (percentage < 80) return 'text-yellow-500';
  return 'text-red-500';
}

// Get cost estimate for token usage (in USD)
export function estimateCost(tokenCount: number, modelTier: 'free' | 'pro' | 'enterprise'): number {
  // Example pricing (simplified):
  // Free models: $0.001 per 1K tokens
  // Pro models: $0.003 per 1K tokens
  // Enterprise models: $0.01 per 1K tokens
  const rates = {
    free: 0.001,
    pro: 0.003,
    enterprise: 0.01
  };
  
  return (tokenCount / 1000) * rates[modelTier];
}

// Format cost as USD
export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}