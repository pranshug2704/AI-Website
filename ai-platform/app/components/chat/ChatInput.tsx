'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AIModel, ImageContent } from '@/app/types';

interface ChatInputProps {
  onSendMessage: (message: string, images?: ImageContent[]) => void;
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
  const [message, setMessage] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(
    selectedModel?.id || 'auto-select'
  );
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [images, setImages] = useState<ImageContent[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update local state when prop changes
  useEffect(() => {
    if (selectedModel?.id) {
      setSelectedModelId(selectedModel.id);
    }
  }, [selectedModel]);

  useEffect(() => {
    // Fetch available providers on component mount
    async function fetchAvailableProviders() {
      try {
        setIsLoadingProviders(true);
        const response = await fetch('/api/models/available');
        if (response.ok) {
          const data = await response.json();
          console.log('Available providers:', data.providers);
          setAvailableProviders(data.providers || []);
        } else {
          console.error('Failed to fetch available providers');
        }
      } catch (error) {
        console.error('Error fetching available providers:', error);
      } finally {
        setIsLoadingProviders(false);
      }
    }

    fetchAvailableProviders();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || images.length > 0) && !isLoading) {
      // Always send both text message and images
      console.log(`Sending message: text="${message.trim()}", images=${images.length}`);
      onSendMessage(message.trim(), images.length > 0 ? images : undefined);
      setMessage('');
      setImages([]);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModelId = e.target.value;
    setSelectedModelId(newModelId);
    onModelChange(newModelId);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Track how many files we've processed
    let processedCount = 0;
    const totalFiles = Array.from(files).filter(file => file.type.startsWith('image/')).length;
    const newImages: ImageContent[] = [];
    
    Array.from(files).forEach(file => {
      // Only process image files
      if (!file.type.startsWith('image/')) {
        console.log('Skipping non-image file:', file.name);
        return;
      }
      
      console.log('Processing image:', file.name, file.type);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          // Add image to the list
          const imageData = result.split(',')[1]; // extract base64 data
          console.log('Image loaded, data length:', imageData.length);
          
          newImages.push({
            url: '', // We'll use data instead
            data: imageData,
            mimeType: file.type,
            alt: file.name
          });
          
          processedCount++;
          console.log(`Processed ${processedCount} of ${totalFiles} images`);
          
          // Only update state when all images are processed
          if (processedCount === totalFiles) {
            console.log('All images processed, updating state with:', newImages.length, 'images');
            setImages(prevImages => [...prevImages, ...newImages]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prevImages => prevImages.filter((_, i) => i !== index));
  };

  // Check if the selected model supports images
  const modelSupportsImages = () => {
    if (!selectedModel) return false;
    
    // For now, only Gemini/Google models support image inputs
    return selectedModel.provider.toLowerCase() === 'google';
  };

  // Group models by provider for better organization
  const groupedModels = availableModels.reduce((groups, model) => {
    const provider = model.provider;
    if (!groups[provider]) {
      groups[provider] = [];
    }
    groups[provider].push(model);
    return groups;
  }, {} as Record<string, AIModel[]>);

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
        {/* Image previews */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 mb-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <img 
                  src={`data:${image.mimeType};base64,${image.data}`}
                  alt={image.alt || 'Uploaded image'}
                  className="h-20 w-20 object-cover rounded border border-gray-300 dark:border-gray-600"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={images.length > 0 
              ? "Add a message or send the image(s)..." 
              : "Type your message here... (Press Enter to send, Shift+Enter for new line)"
            }
            className="w-full p-3 pr-24 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
            style={{ minHeight: '40px', maxHeight: '200px' }}
            disabled={isLoading}
            rows={1}
          />
          <div className="absolute bottom-2 right-2 flex items-center space-x-2">
            {/* Image upload button - only show for models that support images */}
            {modelSupportsImages() && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 p-1"
                disabled={isLoading}
                title="Attach image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
              </button>
            )}
            
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md px-2 py-1 flex items-center"
              >
                {selectedModelId === 'auto-select'
                  ? 'Auto-select'
                  : selectedModel?.name || 'Select model'}
                <svg
                  className="h-4 w-4 ml-1"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>

              {isModelDropdownOpen && (
                <div className="absolute bottom-full right-0 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 w-64">
                  <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Select AI Model
                    </div>
                  </div>
                  <div className="p-2 max-h-60 overflow-y-auto">
                    <div 
                      className="py-1 px-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      onClick={() => {
                        setSelectedModelId('auto-select');
                        onModelChange('auto-select');
                        setIsModelDropdownOpen(false);
                      }}
                    >
                      <div className="font-medium">Auto-select</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Intelligently choose the best model</div>
                    </div>
                    
                    {/* Grouped models by provider */}
                    {Object.entries(groupedModels).map(([provider, models]) => {
                      const isProviderAvailable = availableProviders.includes(provider.toLowerCase());
                      return (
                        <div key={provider} className="mt-2">
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-300 px-2 py-1 bg-gray-50 dark:bg-gray-700 rounded flex items-center">
                            {provider}
                            {isProviderAvailable ? (
                              <span className="ml-1 text-green-600 dark:text-green-400">✓</span>
                            ) : (
                              <span className="ml-1 text-yellow-500 dark:text-yellow-400 text-xs">⚠️ API not configured</span>
                            )}
                          </div>
                          {models.map(model => (
                            <div 
                              key={model.id}
                              className={`py-1 px-2 text-sm cursor-pointer rounded mt-1 ${
                                isProviderAvailable 
                                  ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white' 
                                  : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                              } ${selectedModelId === model.id ? 'bg-primary-50 dark:bg-primary-900/30' : ''}`}
                              onClick={() => {
                                if (isProviderAvailable) {
                                  setSelectedModelId(model.id);
                                  onModelChange(model.id);
                                  setIsModelDropdownOpen(false);
                                }
                              }}
                            >
                              <div className="font-medium flex items-center">
                                {model.name}
                                {model.provider.toLowerCase() === 'google' && (
                                  <span className="ml-2 text-xs text-green-600 dark:text-green-400" title="Supports image input">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{model.description}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={(message.trim() === '' && images.length === 0) || isLoading}
              className={`flex items-center justify-center p-1 rounded-lg text-white ${
                (message.trim() === '' && images.length === 0) || isLoading
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              {isLoading ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg
                  className="h-5 w-5 transform rotate-90"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;