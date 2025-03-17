'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RootLayout from '../components/RootLayout';
import { useAuth } from '../lib/auth-context';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (loading || !user) {
    return (
      <RootLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 pt-16">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-pulse" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                </div>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-center text-gray-900 dark:text-white">
                Loading profile...
              </h2>
            </div>
          </div>
        </div>
      </RootLayout>
    );
  }

  return (
    <RootLayout>
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 pt-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              {/* Header section */}
              <div className="bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-800 dark:to-primary-900 p-6 text-white">
                <div className="flex items-center space-x-4">
                  <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{user.name}</h1>
                    <p className="opacity-90">{user.email}</p>
                    <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
                      {user.subscription.charAt(0).toUpperCase() + user.subscription.slice(1)} Plan
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile content */}
              <div className="p-6">
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Account Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                      <p className="text-gray-900 dark:text-white font-medium">{user.name}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                      <p className="text-gray-900 dark:text-white font-medium">{user.email}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Subscription</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {user.subscription.charAt(0).toUpperCase() + user.subscription.slice(1)} Plan
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Member Since</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Usage Statistics</h2>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-700 dark:text-gray-300">Token Usage</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {user.usage.totalTokens.toLocaleString()} / {user.usage.limit.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                      <div 
                        className="bg-primary-600 dark:bg-primary-500 h-2.5 rounded-full" 
                        style={{ width: `${Math.min(100, (user.usage.totalTokens / user.usage.limit) * 100)}%` }}
                      ></div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {Math.round((1 - user.usage.totalTokens / user.usage.limit) * 100)}% of your monthly allocation remaining
                    </p>
                  </div>
                </div>

                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Subscription</h2>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {user.subscription.charAt(0).toUpperCase() + user.subscription.slice(1)} Plan
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {user.subscription === 'free' ? 'Limited access to AI models' : 
                           user.subscription === 'pro' ? 'Full access to most AI models' : 
                           'Full access to all AI models including enterprise-grade'}
                        </p>
                      </div>
                      {user.subscription !== 'enterprise' && (
                        <Link href="/pricing" className="btn btn-primary text-sm py-1 px-3">
                          Upgrade
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <Link href="/settings" className="btn btn-secondary flex-1 text-center justify-center">
                    Account Settings
                  </Link>
                  <button onClick={handleLogout} className="btn flex-1 bg-red-600 hover:bg-red-700 text-white justify-center">
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </RootLayout>
  );
}