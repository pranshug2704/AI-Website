import { NextRequest, NextResponse } from 'next/server';
import { Message } from '@/app/types';
import { createAIResponse } from '@/app/lib/ai-router';
import { getCurrentUser } from '@/app/lib/server-auth';
import { streamAIResponse } from '@/app/lib/ai-api';
import { routeAIRequest } from '@/app/lib/ai-router';
import { isProviderAvailable, getAvailableProviders } from '@/app/lib/server-utils';
import { hasEnoughTokens, updateUserTokenUsage } from '@/app/lib/server-auth';
import { getCachedApiKeys } from '../keys/route';
import { addMessageToChat, createNewChat } from '@/app/lib/db-utils';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  // Log available providers for debugging
  const providers = getAvailableProviders();
  console.log('Available AI providers:', providers);
  
  // Check provider API keys (without showing full keys)
  const keys = getCachedApiKeys();
  
  console.log('API keys available:', {
    openai: keys.openai ? `${keys.openai.substring(0, 4)}...${keys.openai.substring(keys.openai.length - 4)}` : 'missing',
    anthropic: keys.anthropic ? `${keys.anthropic.substring(0, 4)}...${keys.anthropic.substring(keys.anthropic.length - 4)}` : 'missing',
    google: keys.google ? `${keys.google.substring(0, 4)}...${keys.google.substring(keys.google.length - 4)}` : 'missing',
    mistral: keys.mistral ? `${keys.mistral.substring(0, 4)}...${keys.mistral.substring(keys.mistral.length - 4)}` : 'missing'
  });
  
  // Check if user is authenticated
  const user = await getCurrentUser();
  
  if (!user) {
    console.error('User authentication failed - no user found in session');
    return NextResponse.json(
      { error: 'Unauthorized. Please log in to access this feature.' },
      { status: 401 }
    );
  }
  
  try {
    // Get request body
    const body = await request.json();
    const { messages, modelId } = body as { messages: Message[], modelId?: string };
    
    console.log(`Chat API request received for model: ${modelId || 'default'}`);
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Messages array is required.' },
        { status: 400 }
      );
    }
    
    // Get the latest user message
    const latestUserMessage = [...messages].reverse().find(m => m.role === 'user');
    
    if (!latestUserMessage) {
      return NextResponse.json(
        { error: 'Invalid request. No user message found.' },
        { status: 400 }
      );
    }
    
    // Log if the message contains images
    console.log('Message has images:', !!latestUserMessage.images && latestUserMessage.images.length > 0);
    if (latestUserMessage.images && latestUserMessage.images.length > 0) {
      console.log(`Processing message with ${latestUserMessage.images.length} images`);
      console.log('First image data length:', latestUserMessage.images[0].data?.length || 'no data');
      console.log('Message content type:', latestUserMessage.contentType);
      console.log('Message content length:', latestUserMessage.content.length);
      console.log('Message content preview:', latestUserMessage.content.substring(0, 50) + (latestUserMessage.content.length > 50 ? '...' : ''));
    }
    
    // Estimate token usage
    const estimatedPromptTokens = Math.ceil(
      messages.reduce((acc, msg) => acc + msg.content.length, 0) / 4
    );
    
    // Check if user has enough tokens
    if (!await hasEnoughTokens(estimatedPromptTokens)) {
      return NextResponse.json(
        { error: 'You have reached your token usage limit. Please upgrade your plan for more tokens.' },
        { status: 403 }
      );
    }
    
    // CRITICAL FIX: If Google is the only provider with a key, force use a Google model
    let preferredModelId = modelId;
    if (providers.length === 1 && providers[0] === 'google') {
      if (!modelId || !modelId.startsWith('gemini-')) {
        preferredModelId = 'gemini-pro';
        console.log(`Only Google API key is available - forcing use of ${preferredModelId} instead of ${modelId || 'default'}`);
      }
    }
    
    // Make sure we have a valid modelId, default to gpt-3.5-turbo if not specified
    const safeModelId = preferredModelId || 'gpt-3.5-turbo';
    
    // Stream response from AI
    return createAIResponse(messages, safeModelId);
  } catch (error) {
    console.error('Error in chat API route:', error);
    return new Response(JSON.stringify({ error: 'An error occurred processing your request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}