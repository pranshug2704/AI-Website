'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AIModel } from '@/app/types';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  selectedModel?: AIModel;
  availableModels: AIModel[];
  onModelChange: (modelId: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  selectedModel,
  availableModels,
  onModelChange,
}) => {
  const [message, setMessage] = useState('');
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  // Fetch available providers
  useEffect(() => {
    async function fetchAvailableProviders() {
      try {
        setIsLoadingProviders(true);
        const response = await fetch('/api/models/available');
        if (!response.ok) {
          throw new Error('Failed to fetch available providers');
        }
        const data = await response.json();
        setAvailableProviders(data.providers.map((p: string) => p.toLowerCase()));
      } catch (error) {
        console.error('Error fetching available providers:', error);
        setAvailableProviders([]);
      } finally {
        setIsLoadingProviders(false);
      }
    }

    fetchAvailableProviders();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Close model menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    
    // Add keyboard shortcuts for model selection
    if (e.altKey && e.key === 'm') {
      e.preventDefault();
      setIsModelMenuOpen(!isModelMenuOpen);
    }
  };
  
  // Focus the textarea when the component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Check if a model's provider is available
  const isModelAvailable = (model: AIModel) => {
    return availableProviders.includes(model.provider.toLowerCase());
  };

  // Sort models to prioritize available ones
  const sortedModels = [...availableModels].sort((a, b) => {
    const aAvailable = isModelAvailable(a);
    const bAvailable = isModelAvailable(b);
    
    if (aAvailable && !bAvailable) return -1;
    if (!aAvailable && bAvailable) return 1;
    return 0;
  });

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 md:px-6">
      <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
        <div className="flex justify-between items-center">
          <div className="relative" ref={modelMenuRef}>
            <button
              type="button"
              onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
              className="text-sm flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
            >
              <span>
                {selectedModel ? selectedModel.name : 'Auto-select model'}
              </span>
              {selectedModel && !isLoadingProviders && !isModelAvailable(selectedModel) && (
                <span className="ml-1 text-amber-500 dark:text-amber-400" title="API key not configured">
                  ⚠️
                </span>
              )}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isModelMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                <div className="p-2">
                  <div className="mb-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Select Model
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        onModelChange('auto');
                        setIsModelMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md ${
                        !selectedModel
                          ? 'bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="font-medium">Auto-select</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Intelligently choose the best model for your request
                      </div>
                    </button>
                    
                    {sortedModels.map((model) => {
                      const modelAvailable = isModelAvailable(model);
                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => {
                            onModelChange(model.id);
                            setIsModelMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md ${
                            selectedModel?.id === model.id
                              ? 'bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                          } ${!modelAvailable ? 'opacity-70' : ''}`}
                        >
                          <div className="font-medium flex items-center justify-between">
                            {model.name}
                            {!isLoadingProviders && !modelAvailable && (
                              <span className="text-amber-500 dark:text-amber-400" title="API key not configured">⚠️</span>
                            )}
                            {!isLoadingProviders && modelAvailable && (
                              <span className="text-green-500 dark:text-green-400" title="API key available">✓</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {model.description || `Provider: ${model.provider}`}
                            {!isLoadingProviders && !modelAvailable && (
                              <span className="block mt-1 text-amber-500 dark:text-amber-400">
                                API key not configured
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {message.length} characters
          </div>
        </div>
        
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-3 pr-20 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-[80px] max-h-[300px] transition-shadow"
            rows={3}
            disabled={isLoading}
          />
          <div className="absolute right-3 bottom-3 flex items-center space-x-2">
            {!isLoading && message.trim().length > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                Press Enter ↵
              </div>
            )}
            <button
              type="submit"
              disabled={!message.trim() || isLoading}
              className={`rounded-md px-4 py-2 font-medium text-sm transition-all shadow-sm hover:shadow ${
                !message.trim() || isLoading
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600 hover:transform hover:scale-105'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center space-x-1">
                  <div className="animate-spin h-4 w-4 border-2 border-gray-100 border-opacity-50 rounded-full border-t-transparent"></div>
                  <span>Sending</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <span>Send</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          </div>
          
          {/* Keyboard shortcuts hint */}
          <div className="absolute bottom-full right-0 mb-1 text-xs text-gray-500 dark:text-gray-400">
            <kbd className="px-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded">Alt+M</kbd> to change model
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;