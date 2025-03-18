import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/server-auth';
import { generateChatTitle } from '@/app/lib/chat-utils';
import { Message } from '@/app/types';
import prisma from '@/app/lib/prisma';

export async function POST(request: NextRequest) {
  // Check if user is authenticated
  const user = await getCurrentUser();
  
  if (!user) {
    console.error('[API/chat/title] Unauthorized request');
    return NextResponse.json(
      { error: 'Unauthorized. Please log in to access this feature.' },
      { status: 401 }
    );
  }
  
  try {
    // Get request body
    const body = await request.json();
    const { chatId, messages } = body as { chatId: string, messages: Message[] };
    
    console.log(`[API/chat/title] Generating title for chat ${chatId} with ${messages?.length || 0} messages`);
    
    if (!chatId || !messages || messages.length === 0) {
      console.error('[API/chat/title] Invalid request - missing chatId or messages');
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
      console.error(`[API/chat/title] Chat not found or unauthorized: ${chatId}`);
      return NextResponse.json(
        { error: 'Chat not found or you do not have permission to access it.' },
        { status: 404 }
      );
    }
    
    // Get the first user message
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) {
      console.log('[API/chat/title] No user messages found, returning default title');
      return NextResponse.json({ title: 'New Chat' });
    }
    
    console.log(`[API/chat/title] First user message: "${firstUserMessage.content.substring(0, 50)}..."`);
    
    // Always create a title from the message content itself
    let title;
    
    if (firstUserMessage.content.trim().length === 0) {
      title = "New Chat";
    } else {
      // Use direct content truncation for the title
      const contentText = firstUserMessage.content.trim();
      title = contentText.length > 30 ? contentText.substring(0, 30) + '...' : contentText;
    }
    
    console.log(`[API/chat/title] Generated title directly from message: "${title}"`);
    
    // Only use generateChatTitle as a backup
    if (title === 'New Chat') {
      const backupTitle = generateChatTitle(firstUserMessage.content);
      if (backupTitle !== 'New Chat') {
        title = backupTitle;
        console.log(`[API/chat/title] Using backup title generation: "${title}"`);
      }
    }
    
    // Don't update if the title is still "New Chat" and message has content
    if (title === 'New Chat' && firstUserMessage.content.trim().length > 0) {
      // Create a more descriptive title
      const words = firstUserMessage.content.split(' ').filter(word => word.trim().length > 0);
      if (words.length > 0) {
        // Take first few words
        const fallbackTitle = words.slice(0, 3).join(' ') + '...';
        console.log(`[API/chat/title] Using first few words as title: "${fallbackTitle}"`);
        title = fallbackTitle;
      }
    }
    
    // Update the chat title in the database
    console.log(`[API/chat/title] Updating chat in database with title: "${title}"`);
    await prisma.chat.update({
      where: {
        id: chatId
      },
      data: {
        title
      }
    });
    
    console.log(`[API/chat/title] Successfully updated chat ${chatId} with title: "${title}"`);
    return NextResponse.json({ title });
  } catch (error) {
    console.error('[API/chat/title] Error generating chat title:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 