import { User, SubscriptionTier } from '../types';

// Mock user data for demo purposes
// In a real app, this would come from a database or auth provider
const MOCK_USERS: Record<string, User> = {
  'user-free': {
    id: 'user-free',
    name: 'Free User',
    email: 'free@example.com',
    subscription: 'free',
    usage: {
      totalTokens: 1245,
      limit: 100000
    }
  },
  'user-pro': {
    id: 'user-pro',
    name: 'Pro User',
    email: 'pro@example.com',
    subscription: 'pro',
    usage: {
      totalTokens: 352890,
      limit: 1000000
    }
  },
  'user-enterprise': {
    id: 'user-enterprise',
    name: 'Enterprise User',
    email: 'enterprise@example.com',
    subscription: 'enterprise',
    usage: {
      totalTokens: 1237845,
      limit: 10000000
    }
  }
};

// Get the current authenticated user from localStorage
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') {
    return null; // Handle server-side rendering
  }
  
  // Check for authentication token in localStorage
  const token = localStorage.getItem('authToken');
  if (!token) {
    return null;
  }
  
  // Check for user data in localStorage
  const userData = localStorage.getItem('userData');
  if (userData) {
    try {
      const parsedUser = JSON.parse(userData);
      
      // For demo purposes, map to our mock users based on email
      if (parsedUser.email === 'free@example.com') {
        return MOCK_USERS['user-free'];
      } else if (parsedUser.email === 'pro@example.com') {
        return MOCK_USERS['user-pro'];
      } else if (parsedUser.email === 'enterprise@example.com') {
        return MOCK_USERS['user-enterprise'];
      }
      
      // For custom signed-up users, create a free tier user
      return {
        id: `user-${Date.now()}`,
        name: parsedUser.name || 'New User',
        email: parsedUser.email,
        subscription: parsedUser.subscription || 'free',
        usage: {
          totalTokens: 0,
          limit: 100000
        }
      };
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }
  
  return null;
}

// Check if user has access to a feature based on their subscription
export function hasAccess(feature: string, tier: SubscriptionTier): boolean {
  switch (feature) {
    case 'basic-models':
      return true; // Available to all tiers
    case 'advanced-models':
      return tier === 'pro' || tier === 'enterprise';
    case 'enterprise-models':
      return tier === 'enterprise';
    case 'export':
      return tier === 'pro' || tier === 'enterprise';
    case 'history':
      return true; // Available to all tiers
    case 'unlimited-history':
      return tier === 'pro' || tier === 'enterprise';
    default:
      return false;
  }
}

// Update user token usage
export function updateUserTokenUsage(userId: string, tokens: number): void {
  // In a real app, this would update a database
  if (MOCK_USERS[userId]) {
    MOCK_USERS[userId].usage.totalTokens += tokens;
  }
}

// Check if user has enough tokens left
export function hasEnoughTokens(userId: string, estimatedTokens: number): boolean {
  const user = MOCK_USERS[userId];
  if (!user) return false;
  
  return user.usage.totalTokens + estimatedTokens <= user.usage.limit;
}

// Get remaining tokens for a user
export function getRemainingTokens(userId: string): number {
  const user = MOCK_USERS[userId];
  if (!user) return 0;
  
  return Math.max(0, user.usage.limit - user.usage.totalTokens);
}

// Login a user
export function loginUser(email: string, password: string): User | null {
  // For demo purposes, validate the hardcoded credentials
  if (email === 'free@example.com' && password === 'password') {
    const user = MOCK_USERS['user-free'];
    
    // Store user data in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', `token-${Date.now()}`);
      localStorage.setItem('userData', JSON.stringify(user));
    }
    
    return user;
  } else if (email === 'pro@example.com' && password === 'password') {
    const user = MOCK_USERS['user-pro'];
    
    // Store user data in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', `token-${Date.now()}`);
      localStorage.setItem('userData', JSON.stringify(user));
    }
    
    return user;
  } else if (email === 'enterprise@example.com' && password === 'password') {
    const user = MOCK_USERS['user-enterprise'];
    
    // Store user data in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', `token-${Date.now()}`);
      localStorage.setItem('userData', JSON.stringify(user));
    }
    
    return user;
  }
  
  return null;
}

// Register a new user
export function registerUser(name: string, email: string, password: string, subscription: SubscriptionTier = 'free'): User {
  // In a real app, this would create a new user in the database
  // For demo purposes, we'll create a user and store it in localStorage
  
  const user: User = {
    id: `user-${Date.now()}`,
    name,
    email,
    subscription,
    usage: {
      totalTokens: 0,
      limit: subscription === 'free' ? 100000 : subscription === 'pro' ? 1000000 : 10000000
    }
  };
  
  // Store user data in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('authToken', `token-${Date.now()}`);
    localStorage.setItem('userData', JSON.stringify(user));
  }
  
  return user;
}

// Logout the current user
export function logoutUser(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
  }
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return !!localStorage.getItem('authToken');
}