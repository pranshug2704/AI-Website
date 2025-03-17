'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RootLayout from '../components/RootLayout';
import { useAuth } from '../lib/auth-context';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [name, setName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      setName(user.name);
    }

    // Check dark mode preference
    if (typeof window !== 'undefined') {
      setDarkMode(localStorage.getItem('darkMode') === 'true');
    }
  }, [user, loading, router]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', String(newMode));
      if (newMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    // Simulate API call
    setTimeout(() => {
      setUpdateSuccess(true);
      setIsUpdating(false);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);
    }, 1000);
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
                Loading settings...
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Account Settings</h1>

            <div className="space-y-6">
              {/* Profile Settings */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile Information</h2>
                </div>
                <div className="p-6">
                  <form onSubmit={handleProfileUpdate}>
                    <div className="mb-4">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Full Name
                      </label>
                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email Address
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={user.email}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Email address cannot be changed.
                      </p>
                    </div>
                    <div className="flex justify-end mt-6">
                      <button
                        type="submit"
                        className="btn btn-primary relative"
                        disabled={isUpdating}
                      >
                        {isUpdating ? 'Updating...' : 'Update Profile'}
                      </button>
                    </div>
                    {updateSuccess && (
                      <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm rounded">
                        Profile updated successfully!
                      </div>
                    )}
                  </form>
                </div>
              </div>

              {/* Appearance Settings */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Appearance</h2>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-gray-900 dark:text-white font-medium">Dark Mode</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Toggle between light and dark theme
                      </p>
                    </div>
                    <div className="relative inline-block w-12 mr-2 align-middle select-none">
                      <input
                        type="checkbox"
                        name="toggle"
                        id="toggle"
                        checked={darkMode}
                        onChange={toggleDarkMode}
                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                      />
                      <label
                        htmlFor="toggle"
                        className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                          darkMode ? 'bg-primary-600' : 'bg-gray-300'
                        }`}
                      ></label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notifications</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-gray-900 dark:text-white font-medium">Email Notifications</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Receive updates about your account and usage
                        </p>
                      </div>
                      <div className="relative inline-block w-12 mr-2 align-middle select-none">
                        <input
                          type="checkbox"
                          name="email-toggle"
                          id="email-toggle"
                          defaultChecked={true}
                          className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                        />
                        <label
                          htmlFor="email-toggle"
                          className="toggle-label block overflow-hidden h-6 rounded-full bg-primary-600 cursor-pointer"
                        ></label>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-gray-900 dark:text-white font-medium">Marketing Emails</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Receive news, updates, and special offers
                        </p>
                      </div>
                      <div className="relative inline-block w-12 mr-2 align-middle select-none">
                        <input
                          type="checkbox"
                          name="marketing-toggle"
                          id="marketing-toggle"
                          defaultChecked={false}
                          className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                        />
                        <label
                          htmlFor="marketing-toggle"
                          className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                        ></label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* API Keys Settings */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden" id="api-keys">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">API Keys</h2>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Configure your API keys for different AI providers. These keys are required to use external AI services.
                  </p>
                  
                  <div className="space-y-6">
                    {/* OpenAI API Key */}
                    <div>
                      <label htmlFor="openai-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        OpenAI API Key
                      </label>
                      <div className="flex">
                        <input
                          id="openai-key"
                          type="password"
                          placeholder="sk-..."
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-l-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                        />
                        <button className="px-4 py-2 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                          Save
                        </button>
                      </div>
                    </div>
                    
                    {/* Google AI API Key */}
                    <div>
                      <label htmlFor="google-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Google AI API Key
                      </label>
                      <div className="flex">
                        <input
                          id="google-key"
                          type="password"
                          placeholder="AIza..."
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-l-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                        />
                        <button className="px-4 py-2 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                          Save
                        </button>
                      </div>
                    </div>
                    
                    {/* Anthropic API Key */}
                    <div>
                      <label htmlFor="anthropic-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Anthropic API Key
                      </label>
                      <div className="flex">
                        <input
                          id="anthropic-key"
                          type="password"
                          placeholder="sk-ant-..."
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-l-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                        />
                        <button className="px-4 py-2 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                          Save
                        </button>
                      </div>
                    </div>
                    
                    {/* Mistral API Key */}
                    <div>
                      <label htmlFor="mistral-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Mistral API Key
                      </label>
                      <div className="flex">
                        <input
                          id="mistral-key"
                          type="password"
                          placeholder="..."
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-l-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                        />
                        <button className="px-4 py-2 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <style jsx>{`
        .toggle-checkbox:checked + .toggle-label {
          background-color: #0284c7;
        }
        .toggle-checkbox {
          right: 0;
          z-index: 1;
          border-color: #0284c7;
          transition: all 0.3s;
        }
        .toggle-checkbox:checked {
          right: 6px;
          border-color: #0284c7;
        }
        .toggle-label {
          transition: background-color 0.3s;
        }
      `}</style>
    </RootLayout>
  );
}