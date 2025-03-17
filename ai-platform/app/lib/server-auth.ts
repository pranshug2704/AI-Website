import 'server-only';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { User } from '../types';

/**
 * Get the current user from the NextAuth session on the server side
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // Get current session from NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.id) {
      console.warn('No valid session found in getCurrentUser');
      return null;
    }
    
    // Map NextAuth session user to our User type
    const user: User = {
      id: session.user.id,
      name: session.user.name || 'User',
      email: session.user.email || '',
      subscription: session.user.subscription as 'free' | 'pro' | 'enterprise',
      usage: {
        totalTokens: session.user.usageTotal || 0,
        limit: session.user.usageLimit || 100000
      }
    };
    
    return user;
  } catch (error) {
    console.error('Error getting current user from session:', error);
    return null;
  }
}

/**
 * Check if user has enough tokens left in their quota
 */
export async function hasEnoughTokens(estimatedTokens: number): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  
  const totalTokens = user.usage?.totalTokens || 0;
  const tokenLimit = user.usage?.limit || 100000;
  
  return totalTokens + estimatedTokens <= tokenLimit;
}

/**
 * Update user token usage
 */
export async function updateUserTokenUsage(tokens: number): Promise<void> {
  // In a real application, this would update the database
  // For now, we'll just log it
  console.log(`Adding ${tokens} tokens to user usage (server-side)`);
} 