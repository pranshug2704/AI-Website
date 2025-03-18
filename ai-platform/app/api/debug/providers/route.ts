import { NextResponse } from 'next/server';
import { getAvailableProviders, isProviderAvailable } from '@/app/lib/server-utils';

export async function GET() {
  // Get all providers we support
  const allProviders = ['openai', 'anthropic', 'google', 'mistral'];
  
  // Get available providers
  const availableProviders = getAvailableProviders();
  
  // Get API key info (masked for security)
  const providerKeys = {
    openai: process.env.OPENAI_API_KEY 
      ? `${process.env.OPENAI_API_KEY.substring(0, 4)}...${process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 4)}` 
      : null,
    anthropic: process.env.ANTHROPIC_API_KEY 
      ? `${process.env.ANTHROPIC_API_KEY.substring(0, 4)}...${process.env.ANTHROPIC_API_KEY.substring(process.env.ANTHROPIC_API_KEY.length - 4)}` 
      : null,
    google: process.env.GOOGLE_API_KEY 
      ? `${process.env.GOOGLE_API_KEY.substring(0, 4)}...${process.env.GOOGLE_API_KEY.substring(process.env.GOOGLE_API_KEY.length - 4)}` 
      : null,
    mistral: process.env.MISTRAL_API_KEY 
      ? `${process.env.MISTRAL_API_KEY.substring(0, 4)}...${process.env.MISTRAL_API_KEY.substring(process.env.MISTRAL_API_KEY.length - 4)}` 
      : null,
  };
  
  // Environment variable inspection
  const envInfo = {
    NODE_ENV: process.env.NODE_ENV,
    serverRuntimeEnv: typeof window === 'undefined' ? 'server' : 'client',
  };
  
  return NextResponse.json({
    allProviders,
    availableProviders,
    providerKeys,
    providerStatus: allProviders.map(provider => ({
      provider,
      available: isProviderAvailable(provider),
    })),
    envInfo,
  });
} 