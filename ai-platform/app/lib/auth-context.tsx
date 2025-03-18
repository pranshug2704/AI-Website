'use client';

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { User } from '../types';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, subscription?: 'free' | 'pro' | 'enterprise') => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const loading = status === 'loading';
  const router = useRouter();
  
  // Map NextAuth session user to our User type
  const user: User | null = session?.user ? {
    id: session.user.id as string,
    name: session.user.name as string,
    email: session.user.email as string,
    subscription: (session.user.subscription as 'free' | 'pro' | 'enterprise') || 'free',
    // Make the structure compatible with our User interface that handles both mock and real auth
    usageTotal: (session.user as any).usageTotal || 0,
    usageLimit: (session.user as any).usageLimit || 100000,
  } : null;

  // Add a function to refresh the session
  const refreshSession = useCallback(async () => {
    try {
      console.log('[AuthContext] Forcing session refresh');
      await fetch('/api/auth/session'); // Trigger a session refresh
      router.refresh(); // Refresh the router
    } catch (error) {
      console.error('[AuthContext] Error refreshing session:', error);
    }
  }, [router]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Attempting login for:', email);
      
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      });
      
      if (result?.error) {
        console.error('Login error:', result.error);
        return false;
      }
      
      if (result?.ok) {
        console.log('Login successful, refreshing session data');
        
        // Force a session update
        router.refresh();
        
        // Short delay before redirect to ensure session is updated
        setTimeout(() => {
          console.log('Redirecting to chat page after successful login');
          router.push('/chat');
        }, 500);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error during login:', error);
      return false;
    }
  };

  const register = async (
    name: string, 
    email: string, 
    password: string, 
    subscription: 'free' | 'pro' | 'enterprise' = 'free'
  ): Promise<boolean> => {
    try {
      console.log('Starting registration process for:', email);
      
      // Call registration API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password, subscription })
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Registration API error:', responseData.error);
        throw new Error(responseData.error || 'Registration failed');
      }
      
      console.log('Registration successful, attempting auto-login');
      
      // Wait longer to ensure the user is properly created in the database
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to log in after successful registration
      let success = false;
      
      try {
        // First login attempt
        success = await signIn('credentials', {
          email,
          password,
          redirect: false
        }).then(result => {
          if (result?.error) {
            console.error('Auto-login error:', result.error);
            return false;
          }
          return result?.ok || false;
        });
        
        // If first attempt fails, try again with increasing delays (retry logic)
        if (!success) {
          console.log('First login attempt failed, retrying...');
          
          for (let i = 0; i < 3; i++) {
            // Exponential backoff: 2s, 4s, 8s
            const delay = Math.pow(2, i + 1) * 1000;
            console.log(`Retrying login in ${delay}ms...`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            
            success = await signIn('credentials', {
              email,
              password,
              redirect: false
            }).then(result => {
              if (result?.error) {
                console.error(`Retry ${i+1} login error:`, result.error);
                return false;
              }
              return result?.ok || false;
            });
            
            if (success) {
              console.log('Auto login succeeded on retry', i+1);
              break;
            }
          }
        }
      } catch (loginError) {
        console.error('Exception during auto-login attempts:', loginError);
        success = false;
      }
      
      // Force refresh session
      if (success) {
        console.log('Auto-login successful, refreshing session data');
        router.refresh();
        
        // Navigate to chat after a brief delay to allow session to update
        setTimeout(() => router.push('/chat'), 500);
        return true;
      } 
      
      // If login failed after all retries, redirect to login page
      console.log('Auto-login failed after retries, redirecting to login page');
      router.push('/login?message=registration-successful');
      return false;
    } catch (error) {
      console.error('Error during registration:', error);
      return false;
    }
  };

  const logout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  const value = {
    user,
    loading,
    refreshSession,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}