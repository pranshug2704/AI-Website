import { NextRequest, NextResponse } from 'next/server';
import { getAvailableProviders, isProviderAvailable } from '@/app/lib/server-utils';
import { detectGoogleModels } from '@/app/lib/ai-api';

export async function GET(request: NextRequest) {
  try {
    // Get available providers from server utils
    const availableProviders = getAvailableProviders();
    
    // Get detailed status for all providers
    const allProviders = ['openai', 'anthropic', 'google', 'mistral'];
    const providerStatus = allProviders.map(provider => ({
      name: provider,
      available: isProviderAvailable(provider),
      // Mask API keys for security
      keyInfo: isProviderAvailable(provider) 
        ? `${provider} API key configured` 
        : `${provider} API key missing`
    }));
    
    // Log provider status on the server for debugging
    console.log('Available providers API called. Status:', providerStatus);
    
    // Get available models for Google if configured
    let googleModels: string[] = [];
    if (availableProviders.includes('google')) {
      try {
        googleModels = await detectGoogleModels();
      } catch (error) {
        console.error('Error detecting Google models:', error);
      }
    }
    
    // Return the providers and detected models
    return NextResponse.json({
      providers: availableProviders,
      count: availableProviders.length,
      allProviders: providerStatus,
      modelDetails: {
        google: googleModels
      },
      status: 'success'
    });
  } catch (error) {
    console.error('Error in /api/models/available:', error);
    return NextResponse.json(
      { error: 'Failed to get available models', status: 'error' },
      { status: 500 }
    );
  }
} 