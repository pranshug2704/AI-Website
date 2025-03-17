import { NextRequest, NextResponse } from 'next/server';
import { streamAIResponse } from '@/app/lib/ai-api';
import { routeAIRequest } from '@/app/lib/ai-router';
import { Message } from '@/app/types';
import { isProviderAvailable, getAvailableProviders } from '@/app/lib/server-utils';
import { getCurrentUser, hasEnoughTokens, updateUserTokenUsage } from '@/app/lib/server-auth';

export async function POST(request: NextRequest) {
  // Log available providers for debugging
  const providers = getAvailableProviders();
  console.log('Available AI providers:', providers);
  
  // Check provider API keys (without showing full keys)
  const openaiKey = process.env.OPENAI_API_KEY || '';
  const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
  const googleKey = process.env.GOOGLE_API_KEY || '';
  const mistralKey = process.env.MISTRAL_API_KEY || '';
  
  console.log('API keys available:', {
    openai: openaiKey ? `${openaiKey.substring(0, 4)}...${openaiKey.substring(openaiKey.length - 4)}` : 'missing',
    anthropic: anthropicKey ? `${anthropicKey.substring(0, 4)}...${anthropicKey.substring(anthropicKey.length - 4)}` : 'missing',
    google: googleKey ? `${googleKey.substring(0, 4)}...${googleKey.substring(googleKey.length - 4)}` : 'missing',
    mistral: mistralKey ? `${mistralKey.substring(0, 4)}...${mistralKey.substring(mistralKey.length - 4)}` : 'missing'
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
    
    // Route the request to the appropriate model
    const { selectedModel, segmentedPrompts, taskType } = routeAIRequest({
      prompt: latestUserMessage.content,
      userTier: user.subscription,
      preferredModelId: modelId
    });
    
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