import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/server-auth';
import { generateChatTitle } from '@/app/lib/chat-utils';
import { Message } from '@/app/types';
import prisma from '@/app/lib/prisma';

export async function POST(request: NextRequest) {
  // Check if user is authenticated
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized. Please log in to access this feature.' },
      { status: 401 }
    );
  }
  
  try {
    // Get request body
    const body = await request.json();
    const { chatId, messages } = body as { chatId: string, messages: Message[] };
    
    if (!chatId || !messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Chat ID and messages are required.' },
        { status: 400 }
      );
    }
    
    // Verify the chat belongs to the user
    const chat = await prisma.chat.findUnique({
      where: {
        id: chatId,
        userId: user.id
      }
    });
    
    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found or you do not have permission to access it.' },
        { status: 404 }
      );
    }
    
    // For now, use the simple title generation function
    // Get the first user message
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) {
      return NextResponse.json({ title: 'New Chat' });
    }
    
    const title = generateChatTitle(firstUserMessage.content);
    
    // Update the chat title in the database
    await prisma.chat.update({
      where: {
        id: chatId
      },
      data: {
        title
      }
    });
    
    return NextResponse.json({ title });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 