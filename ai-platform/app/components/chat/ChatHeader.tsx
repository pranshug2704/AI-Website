import React, { useEffect, useState } from 'react';
import MobileSidebarToggle from './MobileSidebarToggle';
import { AIModel } from '@/app/types';

interface ChatHeaderProps {
  title: string;
  selectedModel?: AIModel;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (isOpen: boolean) => void;
  onNewChat: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  selectedModel,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,
  onNewChat,
}) => {
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch available providers on mount
  useEffect(() => {
    async function fetchAvailableProviders() {
      try {
        const response = await fetch('/api/models/available');
        if (response.ok) {
          const data = await response.json();
          setAvailableProviders(data.providers || []);
        }
      } catch (error) {
        console.error('Error fetching available providers:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAvailableProviders();
  }, []);

  // Check if the selected model's provider is available
  const isProviderAvailable = selectedModel && 
    availableProviders.includes(selectedModel.provider.toLowerCase());

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <MobileSidebarToggle 
            isMobileSidebarOpen={isMobileSidebarOpen}
            setIsMobileSidebarOpen={setIsMobileSidebarOpen}
          />
          <h2 className="text-lg font-medium text-gray-900 dark:text-white ml-2">
            {title}
          </h2>
          {selectedModel && (
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              ({selectedModel.name})
            </span>
          )}
        </div>
        <button
          onClick={onNewChat}
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          aria-label="New chat"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 mr-1" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 4v16m8-8H4" 
            />
          </svg>
          New Chat
        </button>
      </div>
      
      {selectedModel && !isLoading && !isProviderAvailable && (
        <div className="mt-2 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 p-2 rounded-md text-sm flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>
            The API key for {selectedModel.provider} is not available. Please select another model or configure the API key in your settings.
          </span>
        </div>
      )}
    </div>
  );
};

export default ChatHeader; 