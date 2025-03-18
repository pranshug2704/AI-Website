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
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    google: '',
    mistral: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [activeTab, setActiveTab] = useState('apiKeys');

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

  // Fetch current API keys on load
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    
    async function fetchApiKeys(attempt = 0) {
      try {
        const response = await fetch('/api/keys');
        if (response.ok) {
          const data = await response.json();
          if (mounted) {
            setApiKeys({
              openai: data.openai || '',
              anthropic: data.anthropic || '',
              google: data.google || '',
              mistral: data.mistral || '',
            });
          }
        } else if (attempt < maxRetries) {
          // If server error, retry after a delay
          console.log(`API keys fetch failed (attempt ${attempt + 1}/${maxRetries}), retrying in 1 second...`);
          setTimeout(() => fetchApiKeys(attempt + 1), 1000);
        }
      } catch (error) {
        console.error('Error fetching API keys:', error);
        if (attempt < maxRetries) {
          // If network error, retry after a delay
          console.log(`API keys fetch failed (attempt ${attempt + 1}/${maxRetries}), retrying in 1 second...`);
          setTimeout(() => fetchApiKeys(attempt + 1), 1000);
        }
      }
    }

    if (user) {
      fetchApiKeys();
    }
    
    return () => {
      mounted = false;
    };
  }, [user]);

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

  const handleApiKeyChange = (provider: string, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: value
    }));
  };

  const saveApiKeys = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    // Maximum number of retry attempts if the request fails
    const maxRetries = 3;
    let attempt = 0;
    
    const attemptSave = async () => {
      try {
        const response = await fetch('/api/keys', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiKeys),
        });
        
        if (response.ok) {
          setSaveMessage('API keys saved successfully');
          // Short delay to show success message before reload
          setTimeout(() => {
            // Don't reload the page - just show success
            // This helps prevent blank screen issues
            setIsSaving(false);
          }, 1500);
        } else {
          // If server error and we have retries left
          if (attempt < maxRetries) {
            attempt++;
            console.log(`Save failed (status ${response.status}), retrying (${attempt}/${maxRetries})...`);
            setTimeout(attemptSave, 1000);
          } else {
            setSaveMessage('Error saving API keys');
            setIsSaving(false);
          }
        }
      } catch (error) {
        console.error('Error saving API keys:', error);
        // If network error and we have retries left
        if (attempt < maxRetries) {
          attempt++;
          console.log(`Save failed (network error), retrying (${attempt}/${maxRetries})...`);
          setTimeout(attemptSave, 1000);
        } else {
          setSaveMessage('Error saving API keys');
          setIsSaving(false);
        }
      }
    };
    
    attemptSave();
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
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              {/* Header section */}
              <div className="bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-800 dark:to-primary-900 p-6 text-white">
                <h1 className="text-2xl font-bold">Account Settings</h1>
                <p className="opacity-90">Configure your account preferences and API keys</p>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('apiKeys')}
                    className={`py-4 px-6 font-medium text-sm border-b-2 ${
                      activeTab === 'apiKeys'
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    API Keys
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`py-4 px-6 font-medium text-sm border-b-2 ${
                      activeTab === 'profile'
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => setActiveTab('preferences')}
                    className={`py-4 px-6 font-medium text-sm border-b-2 ${
                      activeTab === 'preferences'
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    Preferences
                  </button>
                </nav>
              </div>

              {/* Content */}
              <div className="p-6">
                {activeTab === 'apiKeys' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">API Keys</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      Configure API keys for different AI providers. Your keys are encrypted and stored securely.
                    </p>

                    <div className="space-y-6">
                      {/* OpenAI API Key */}
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700 dark:text-gray-300" viewBox="0 0 1024 1024" fill="currentColor">
                            <path d="M651.297 170.254c52.404-30.213 118.143-30.213 170.547 0l91.387 52.809c52.403 30.213 84.36 86.544 84.36 147.154v103.206c0 8.315-6.743 15.058-15.059 15.058h-90.345c-8.315 0-15.058-6.743-15.058-15.058V376.25c0-27.93-15.059-53.766-39.369-67.867l-91.386-52.809c-24.31-14.032-54.578-14.032-78.888 0l-91.387 52.809c-24.31 14.101-39.369 39.937-39.369 67.867v105.618c0 27.93 15.059 53.766 39.369 67.867l91.387 52.809c24.31 14.032 54.577 14.032 78.888 0 7.202-4.161 16.4-1.681 20.56 5.52l45.22 78.346c4.162 7.202 1.681 16.4-5.52 20.56-52.404 30.214-118.144 30.214-170.547 0l-91.388-52.808c-52.403-30.213-84.36-86.545-84.36-147.155V376.25c0-60.61 31.957-116.942 84.36-147.155l91.388-52.808v-.033z" />
                            <path d="M304.397 447.495c0-60.611 31.957-116.942 84.36-147.155l91.387-52.809c52.404-30.213 118.144-30.213 170.547 0l91.387 52.809c7.202 4.16 9.683 13.357 5.522 20.56l-45.22 78.345c-4.162 7.201-13.358 9.682-20.56 5.521-24.31-14.032-54.578-14.032-78.887 0l-91.388 52.809c-24.31 14.101-39.369 39.937-39.369 67.867v105.618c0 27.93 15.059 53.766 39.369 67.867l91.387 52.809c24.31 14.032 54.578 14.032 78.888 0l91.387-52.809c24.31-14.101 39.37-39.937 39.37-67.867V589.564c0-8.315 6.742-15.058 15.058-15.058h90.345c8.315 0 15.058 6.743 15.058 15.058v46.547c0 60.61-31.956 116.942-84.36 147.155l-91.387 52.808c-52.404 30.214-118.143 30.214-170.547 0l-91.387-52.808c-52.403-30.213-84.36-86.545-84.36-147.155V447.495z" />
                          </svg>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            OpenAI API Key
                          </label>
                        </div>
                        <input
                          type="password"
                          value={apiKeys.openai}
                          onChange={(e) => handleApiKeyChange('openai', e.target.value)}
                          className="bg-white dark:bg-gray-800 w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500 focus:border-primary-500"
                          placeholder="sk-..."
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline">OpenAI dashboard</a>
                        </p>
                      </div>

                      {/* Anthropic API Key */}
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4M12 8h.01" />
                          </svg>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Anthropic API Key
                          </label>
                        </div>
                        <input
                          type="password"
                          value={apiKeys.anthropic}
                          onChange={(e) => handleApiKeyChange('anthropic', e.target.value)}
                          className="bg-white dark:bg-gray-800 w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500 focus:border-primary-500"
                          placeholder="sk-ant-..."
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Get your API key from <a href="https://console.anthropic.com/keys" target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline">Anthropic console</a>
                        </p>
                      </div>

                      {/* Google API Key */}
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700 dark:text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                          </svg>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Google AI API Key
                          </label>
                        </div>
                        <input
                          type="password"
                          value={apiKeys.google}
                          onChange={(e) => handleApiKeyChange('google', e.target.value)}
                          className="bg-white dark:bg-gray-800 w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500 focus:border-primary-500"
                          placeholder="AIza..."
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline">Google AI Studio</a>
                        </p>
                      </div>

                      {/* Mistral API Key */}
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                          </svg>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Mistral API Key
                          </label>
                        </div>
                        <input
                          type="password"
                          value={apiKeys.mistral}
                          onChange={(e) => handleApiKeyChange('mistral', e.target.value)}
                          className="bg-white dark:bg-gray-800 w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500 focus:border-primary-500"
                          placeholder="..."
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Get your API key from <a href="https://console.mistral.ai/" target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline">Mistral AI console</a>
                        </p>
                      </div>

                      {/* Save button */}
                      <div className="flex justify-end">
                        <button
                          onClick={saveApiKeys}
                          disabled={isSaving}
                          className="btn btn-primary px-6 py-2"
                        >
                          {isSaving ? 'Saving...' : 'Save API Keys'}
                        </button>
                      </div>

                      {/* Success/error message */}
                      {saveMessage && (
                        <div className={`mt-4 p-3 rounded-md ${saveMessage.includes('success') ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {saveMessage}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'profile' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Profile Information</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      Coming soon - Update your profile information here.
                    </p>
                  </div>
                )}

                {activeTab === 'preferences' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">User Preferences</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      Coming soon - Configure your preferences here.
                    </p>
                  </div>
                )}
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