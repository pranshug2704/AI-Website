import { NextRequest, NextResponse } from 'next/server';
import { streamAIResponse } from '@/app/lib/ai-api';
import { routeAIRequest } from '@/app/lib/ai-router';
import { Message } from '@/app/types';
import { isProviderAvailable, getAvailableProviders } from '@/app/lib/server-utils';
import { getCurrentUser, hasEnoughTokens, updateUserTokenUsage } from '@/app/lib/server-auth';
import { getCachedApiKeys } from '../keys/route';

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
    
    // Route the request to the appropriate model
    const { selectedModel, segmentedPrompts, taskType } = routeAIRequest({
      prompt: latestUserMessage.content,
      userTier: user.subscription,
      preferredModelId,
      images: latestUserMessage.images
    });
    
    // Verify one more time that we have an API key for the selected model
    const providerHasKey = isProviderAvailable(selectedModel.provider);
    if (!providerHasKey) {
      return NextResponse.json(
        { 
          error: `The selected model (${selectedModel.name}) requires an API key for ${selectedModel.provider} which is not configured. Please choose a different model or configure the API key in settings.`
        },
        { status: 400 }
      );
    }
    
    // Set up response as a streaming response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Start streaming response in the background
    (async () => {
      try {
        // If the prompt needs to be segmented, handle each segment separately
        if (segmentedPrompts && segmentedPrompts.length > 1) {
          // Send initial metadata
          const metadata = {
            event: 'metadata',
            data: {
              modelId: selectedModel.id,
              modelName: selectedModel.name,
              provider: selectedModel.provider,
              taskType,
              segmented: true,
              segmentCount: segmentedPrompts.length
            }
          };
          await writer.write(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`));
          
          let totalCompletionTokens = 0;
          
          // Process each segment
          for (let i = 0; i < segmentedPrompts.length; i++) {
            // Prepare segment metadata
            const segmentMeta = {
              event: 'segment',
              data: {
                index: i + 1,
                total: segmentedPrompts.length
              }
            };
            await writer.write(encoder.encode(`data: ${JSON.stringify(segmentMeta)}\n\n`));
            
            // Create a message array for this segment
            const segmentMessages: Message[] = [
              ...messages.filter(m => m.role === 'system'),
              {
                id: `segment-${i}`,
                role: 'user',
                content: segmentedPrompts[i],
                createdAt: new Date()
              }
            ];
            
            // Stream the response for this segment
            const responseStream = streamAIResponse(segmentMessages, selectedModel.id);
            
            for await (const chunk of responseStream) {
              const dataChunk = {
                event: 'chunk',
                data: { content: chunk }
              };
              await writer.write(encoder.encode(`data: ${JSON.stringify(dataChunk)}\n\n`));
            }
            
            // Get usage info from final yield
            const usageInfo = await responseStream.next();
            if (usageInfo.done && usageInfo.value) {
              totalCompletionTokens += usageInfo.value.usage.completionTokens;
            }
          }
          
          // Send final usage data
          const usage = {
            event: 'usage',
            data: {
              promptTokens: estimatedPromptTokens,
              completionTokens: totalCompletionTokens,
              totalTokens: estimatedPromptTokens + totalCompletionTokens
            }
          };
          await writer.write(encoder.encode(`data: ${JSON.stringify(usage)}\n\n`));
          
          // Update user token usage
          await updateUserTokenUsage(estimatedPromptTokens + totalCompletionTokens);
        } else {
          // Handle single prompt response
          // Send initial metadata
          const metadata = {
            event: 'metadata',
            data: {
              modelId: selectedModel.id,
              modelName: selectedModel.name,
              provider: selectedModel.provider,
              taskType,
              segmented: false
            }
          };
          await writer.write(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`));
          
          // Stream the response
          const responseStream = streamAIResponse(messages, selectedModel.id);
          
          for await (const chunk of responseStream) {
            const dataChunk = {
              event: 'chunk',
              data: { content: chunk }
            };
            await writer.write(encoder.encode(`data: ${JSON.stringify(dataChunk)}\n\n`));
          }
          
          // Get usage info from final yield
          const usageInfo = await responseStream.next();
          if (usageInfo.done && usageInfo.value) {
            const usage = {
              event: 'usage',
              data: usageInfo.value.usage
            };
            await writer.write(encoder.encode(`data: ${JSON.stringify(usage)}\n\n`));
            
            // Update user token usage
            await updateUserTokenUsage(usageInfo.value.usage.totalTokens);
          }
        }
        
        // Send end event
        const endEvent = { event: 'done' };
        await writer.write(encoder.encode(`data: ${JSON.stringify(endEvent)}\n\n`));
      } catch (error) {
        console.error('Streaming error:', error);
        
        // Send error event
        const errorEvent = {
          event: 'error',
          data: { message: error instanceof Error ? error.message : 'Unknown error occurred' }
        };
        await writer.write(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
      } finally {
        await writer.close();
      }
    })();
    
    return new NextResponse(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}