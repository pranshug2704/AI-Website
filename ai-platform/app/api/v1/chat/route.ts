import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { streamAIResponse } from '@/app/lib/ai-api';
import { detectTaskType, getModelsForTask, getModelById } from '@/app/lib/models';
import { updateUserTokenUsage } from '@/app/lib/chat';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'API key is required in Authorization header' },
        { status: 401 }
      );
    }
    
    const apiKey = authHeader.substring(7);
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    // Find API key in database
    const keyRecord = await prisma.apiKey.findFirst({
      where: { key: hashedKey },
      include: { user: true }
    });
    
    if (!keyRecord) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsed: new Date() }
    });
    
    // Get request body
    const body = await request.json();
    const { messages, modelId, temperature = 0.7 } = body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }
    
    // Check if user has enough tokens
    const user = keyRecord.user;
    
    if (user.usageTotal >= user.usageLimit) {
      return NextResponse.json(
        { error: 'Token usage limit exceeded. Please upgrade your plan.' },
        { status: 403 }
      );
    }
    
    // Get the latest user message
    const latestUserMessage = [...messages].reverse().find(m => m.role === 'user');
    
    if (!latestUserMessage) {
      return NextResponse.json(
        { error: 'No user message found in the messages array' },
        { status: 400 }
      );
    }
    
    // Determine the model to use
    let selectedModelId = modelId;
    
    if (!selectedModelId) {
      // Auto-select model based on task
      const taskType = detectTaskType(latestUserMessage.content);
      const availableModels = getModelsForTask(taskType, user.subscription as any);
      
      if (availableModels.length === 0) {
        return NextResponse.json(
          { error: 'No suitable model found for this task and subscription tier' },
          { status: 400 }
        );
      }
      
      // Select the most capable model available
      selectedModelId = availableModels[0].id;
    } else {
      // Verify that the requested model is available for this user
      const model = getModelById(selectedModelId);
      
      if (!model) {
        return NextResponse.json(
          { error: 'Invalid model ID' },
          { status: 400 }
        );
      }
      
      // Check if user's subscription allows access to this model
      if (
        (model.tier === 'enterprise' && user.subscription !== 'enterprise') ||
        (model.tier === 'pro' && user.subscription === 'free')
      ) {
        return NextResponse.json(
          { error: `Your subscription does not include access to ${model.name}` },
          { status: 403 }
        );
      }
    }
    
    // Stream the response
    const encoder = new TextEncoder();
    const customStream = new TransformStream();
    const writer = customStream.writable.getWriter();
    
    // Start streaming response in the background
    (async () => {
      try {
        // Send initial metadata
        const metadata = {
          model: selectedModelId,
          user: {
            tier: user.subscription,
            usage: {
              total: user.usageTotal,
              limit: user.usageLimit,
              remaining: user.usageLimit - user.usageTotal
            }
          },
          created: new Date().toISOString()
        };
        
        await writer.write(encoder.encode(JSON.stringify(metadata) + '\n\n'));
        
        // Prepare for collecting content
        let fullContent = '';
        let usageInfo: any = null;
        
        // Stream the AI response
        for await (const chunk of streamAIResponse(messages, selectedModelId, temperature)) {
          fullContent += chunk;
          await writer.write(encoder.encode(chunk));
        }
        
        // Get usage information after streaming is complete
        const streamGen = streamAIResponse(messages, selectedModelId, temperature);
        let result = await streamGen.next();
        
        while (!result.done) {
          result = await streamGen.next();
        }
        
        if (result.value) {
          usageInfo = result.value.usage;
          
          // Update user token usage
          await updateUserTokenUsage(user.id, usageInfo.totalTokens);
          
          // Send usage information
          await writer.write(encoder.encode('\n\n' + JSON.stringify({
            usage: {
              prompt_tokens: usageInfo.promptTokens,
              completion_tokens: usageInfo.completionTokens,
              total_tokens: usageInfo.totalTokens
            }
          })));
        }
      } catch (error) {
        console.error('Streaming error:', error);
        
        await writer.write(encoder.encode('\n\n' + JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error'
        })));
      } finally {
        await writer.close();
      }
    })();
    
    return new NextResponse(customStream.readable, {
      headers: {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked'
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