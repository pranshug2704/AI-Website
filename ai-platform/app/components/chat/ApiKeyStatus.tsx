import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface ApiKeyStatus {
  name: string;
  available: boolean;
  keyInfo: string;
}

const ApiKeyStatus: React.FC = () => {
  const [status, setStatus] = useState<ApiKeyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProviderStatus() {
      try {
        setLoading(true);
        const response = await fetch('/api/models/available');
        if (!response.ok) {
          throw new Error('Failed to fetch API key status');
        }
        const data = await response.json();
        setStatus(data.allProviders || []);
      } catch (error) {
        console.error('Error fetching provider status:', error);
        setError('Could not retrieve API key status');
      } finally {
        setLoading(false);
      }
    }

    fetchProviderStatus();
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-500">Checking API keys...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  // Check if any providers are available
  const hasConfiguredProvider = status.some(provider => provider.available);

  if (status.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-medium mb-2">API Key Status</h3>
      
      {!hasConfiguredProvider && (
        <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs rounded-md">
          No API keys configured. Chat functionality is limited.
        </div>
      )}
      
      <div className="space-y-1 mb-2">
        {status.map(provider => (
          <div key={provider.name} className="text-xs flex justify-between items-center">
            <span className="font-medium capitalize">{provider.name}</span>
            <span className={provider.available ? "text-green-500" : "text-gray-400"}>
              {provider.available ? "✓ Configured" : "Not configured"}
            </span>
          </div>
        ))}
      </div>
      
      <Link 
        href="/settings#api-keys" 
        className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
        Configure API Keys
      </Link>
    </div>
  );
};

export default ApiKeyStatus; 