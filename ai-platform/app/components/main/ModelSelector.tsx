'use client';

import React, { useState, useEffect } from 'react';
import { getAvailableModels } from '@/app/lib/models';
import { AIModel } from '@/app/types';

interface ModelSelectorProps {
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
}

export default function ModelSelector({ selectedModelId, onSelectModel }: ModelSelectorProps) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  // Get user tier from environment or default to free
  const userTier = 'pro'; // Hardcoded to pro for now to show all models
  
  // Load available models
  useEffect(() => {
    const availableModels = getAvailableModels(userTier as any);
    setModels(availableModels);
  }, [userTier]);
  
  // Find the selected model
  const selectedModel = models.find(model => model.id === selectedModelId) || models[0];
  
  // Group models by provider
  const groupedModels: Record<string, AIModel[]> = {};
  models.forEach(model => {
    if (!groupedModels[model.provider]) {
      groupedModels[model.provider] = [];
    }
    groupedModels[model.provider].push(model);
  });
  
  // Get provider icon for a model
  const getProviderIcon = (model: AIModel) => {
    return model.icon || 
      (model.provider === 'OpenAI' ? '/icons/openai.svg' : 
      model.provider === 'Anthropic' ? '/icons/anthropic.svg' :
      model.provider === 'Google' ? '/icons/google.svg' :
      model.provider === 'Mistral' ? '/icons/mistral.svg' :
      model.provider === 'Ollama' ? '/icons/llama.svg' :
      '/icons/ai.svg');
  };
  
  return (
    <div className="relative mb-4">
      <div 
        className="flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          {selectedModel && (
            <>
              <img 
                src={getProviderIcon(selectedModel)} 
                alt={selectedModel.provider} 
                className="w-5 h-5 mr-2"
              />
              <span className="font-medium">{selectedModel?.name}</span>
              {selectedModel?.tier !== 'free' && (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                  {selectedModel.tier.toUpperCase()}
                </span>
              )}
            </>
          )}
        </div>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            {Object.entries(groupedModels).map(([provider, providerModels]) => (
              <div key={provider} className="border-b last:border-b-0 dark:border-gray-700">
                <div className="p-2 bg-gray-50 dark:bg-gray-900 font-medium text-sm text-gray-600 dark:text-gray-400">
                  {provider}
                </div>
                {providerModels.map(model => (
                  <div 
                    key={model.id}
                    className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between ${
                      model.id === selectedModelId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => {
                      onSelectModel(model.id);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-center">
                      <img 
                        src={getProviderIcon(model)} 
                        alt={model.provider} 
                        className="w-5 h-5 mr-2"
                      />
                      <div>
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {model.description}
                        </div>
                      </div>
                    </div>
                    {model.tier !== 'free' && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                        {model.tier.toUpperCase()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 