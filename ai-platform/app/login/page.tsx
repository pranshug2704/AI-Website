'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RootLayout from '../components/RootLayout';
import { useAuth } from '../lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Import the useAuth hook
  const { login, user, loading } = useAuth();
  
  // Redirect if user is already logged in
  useEffect(() => {
    if (user && !loading) {
      router.push('/chat');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      console.log('Attempting login for:', email);
      const success = await login(email, password);
      
      if (success) {
        console.log('Login successful, redirecting to chat');
        router.push('/chat');
      } else {
        console.error('Login failed with credentials:', email);
        setError('Invalid credentials. Try these demo accounts: free@example.com, pro@example.com, or enterprise@example.com (password: password)');
        
        // Add debugging info to console
        console.log('Debug info: Check if the database connection is working properly');
        console.log('- Ensure .env.local has DATABASE_URL="file:./prisma/dev.db"');
        console.log('- Check if the prisma/dev.db file exists and has proper permissions');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check for any URL parameters that might indicate redirects
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const message = params.get('message');
    
    if (message === 'registration-successful') {
      setError('Registration successful! Please login with your new credentials.');
    }
  }, []);
  
  return (
    <RootLayout>
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 pt-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                Log in to AI Platform
              </h1>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="your@email.com"
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Password
                    </label>
                    <Link href="/forgot-password" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="••••••••"
                  />
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Logging in...
                      </span>
                    ) : (
                      'Log in'
                    )}
                  </button>
                </div>
              </form>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Don't have an account?{' '}
                  <Link href="/signup" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
                    Sign up
                  </Link>
                </p>
              </div>
              
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  <p className="mb-2 font-medium">Demo Accounts:</p>
                  <p>free@example.com / password</p>
                  <p>pro@example.com / password</p>
                  <p>enterprise@example.com / password</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </RootLayout>
  );
}