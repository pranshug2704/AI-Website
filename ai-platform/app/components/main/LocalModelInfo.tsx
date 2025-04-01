'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { getModelById } from '@/app/lib/models';

// UI components - we'll use simplified versions if the UI components aren't available
const Alert = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={`p-4 rounded-md border ${className}`}>{children}</div>
);

const AlertTitle = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <h5 className={`font-medium mb-1 ${className}`}>{children}</h5>
);

const AlertDescription = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={`text-sm ${className}`}>{children}</div>
);

const Button = ({ 
  className, 
  children, 
  variant, 
  size,
  onClick 
}: { 
  className?: string, 
  children: React.ReactNode,
  variant?: string,
  size?: string,
  onClick?: () => void
}) => (
  <button 
    className={`px-3 py-1 rounded-md border ${variant === 'outline' ? 'bg-transparent border-gray-300' : 'bg-primary text-white'} ${size === 'sm' ? 'text-xs' : 'text-sm'} ${className}`}
    onClick={onClick}
  >
    {children}
  </button>
);

interface LocalModelInfoProps {
  selectedModelId: string;
}

async function checkOllamaStatus(): Promise<{ 
  available: boolean; 
  models?: string[];
  error?: string;
}> {
  try {
    const response = await fetch('/api/local-models/status', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      return { available: false, error: 'Error checking Ollama status' };
    }
    
    return await response.json();
  } catch (error) {
    return { available: false, error: 'Failed to connect to Ollama' };
  }
}

export default function LocalModelInfo({ selectedModelId }: LocalModelInfoProps) {
  const [status, setStatus] = useState<{
    checking: boolean;
    available: boolean;
    models: string[];
    error?: string;
  }>({
    checking: true,
    available: false,
    models: []
  });
  
  const selectedModel = getModelById(selectedModelId);
  const isLocalModel = selectedModel?.provider === 'ollama';
  
  // Only check status if a local model is selected
  useEffect(() => {
    if (!isLocalModel) {
      return;
    }
    
    setStatus(prev => ({ ...prev, checking: true }));
    
    checkOllamaStatus().then(result => {
      setStatus({
        checking: false,
        available: result.available,
        models: result.models || [],
        error: result.error
      });
    });
  }, [isLocalModel, selectedModelId]);
  
  if (!isLocalModel) {
    return null;
  }
  
  const modelName = selectedModelId.split(':')[1];
  const modelAvailable = status.models.some(m => m.includes(modelName));
  
  return (
    <div className="mb-4">
      {status.checking ? (
        <Alert className="bg-slate-100 border-slate-200">
          <div className="flex items-center">
            <Info className="h-4 w-4 mr-2" />
            <AlertTitle>Checking local model status...</AlertTitle>
          </div>
          <AlertDescription>Verifying Ollama is running and model is available</AlertDescription>
        </Alert>
      ) : status.available ? (
        modelAvailable ? (
          <Alert className="bg-green-50 border-green-200">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              <AlertTitle className="text-green-700">Local model ready</AlertTitle>
            </div>
            <AlertDescription className="text-green-700">
              {modelName} is available locally via Ollama
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-yellow-50 border-yellow-200">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 text-yellow-500" />
              <AlertTitle className="text-yellow-700">Model not found</AlertTitle>
            </div>
            <AlertDescription className="flex items-center justify-between text-yellow-700">
              <span>
                {modelName} not found in Ollama. Run: <code className="bg-yellow-100 px-1 py-0.5 rounded">ollama pull {modelName}</code>
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2 h-7 text-yellow-700 border-yellow-300" 
                onClick={() => window.open('https://ollama.com/library', '_blank')}
              >
                Browse Models
              </Button>
            </AlertDescription>
          </Alert>
        )
      ) : (
        <Alert className="bg-red-50 border-red-200">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
            <AlertTitle className="text-red-700">Ollama not available</AlertTitle>
          </div>
          <AlertDescription className="flex items-center justify-between text-red-700">
            <span>
              {status.error || 'Please start Ollama to use local models'}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2 h-7 text-red-700 border-red-300" 
              onClick={() => window.open('https://ollama.com/download', '_blank')}
            >
              Setup Guide
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 