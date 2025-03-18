import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/server-auth';
import prisma from '@/app/lib/prisma';

export async function POST(request: NextRequest) {
  // Check if user is authenticated
  const user = await getCurrentUser();
  
  if (!user) {
    console.error('[API/chat/updateTitle] Unauthorized request');
    return NextResponse.json(
      { error: 'Unauthorized. Please log in to access this feature.' },
      { status: 401 }
    );
  }
  
  try {
    // Get request body
    const body = await request.json();
    const { chatId, title } = body as { chatId: string, title: string };
    
    console.log(`[API/chat/updateTitle] Updating title for chat ${chatId}: "${title}"`);
    
    if (!chatId || !title) {
      console.error('[API/chat/updateTitle] Invalid request - missing chatId or title');
      return NextResponse.json(
        { error: 'Invalid request. Chat ID and title are required.' },
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
      console.error(`[API/chat/updateTitle] Chat not found or unauthorized: ${chatId}`);
      return NextResponse.json(
        { error: 'Chat not found or you do not have permission to access it.' },
        { status: 404 }
      );
    }
    
    // Skip if title is empty or "New Chat" and the existing title is not "New Chat"
    if ((title === 'New Chat' || !title.trim()) && chat.title !== 'New Chat') {
      console.log(`[API/chat/updateTitle] Skipping update to "${title}" as existing title is "${chat.title}"`);
      return NextResponse.json({ 
        success: false,
        message: 'Skipped update as existing title is better',
        title: chat.title 
      });
    }
    
    // Update the chat title in the database
    console.log(`[API/chat/updateTitle] Updating chat in database with title: "${title}"`);
    await prisma.chat.update({
      where: {
        id: chatId
      },
      data: {
        title
      }
    });
    
    console.log(`[API/chat/updateTitle] Successfully updated chat ${chatId} with title: "${title}"`);
    return NextResponse.json({ success: true, title });
  } catch (error) {
    console.error('[API/chat/updateTitle] Error updating chat title:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 