import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/server-auth';
import prisma from '@/app/lib/prisma';
import { Chat } from '@/app/types';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser();
    
    if (!user) {
      console.error('User authentication failed - no user found in session');
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to access this feature.' },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await request.json();
    const chat = body.chat as Chat;
    
    if (!chat) {
      return NextResponse.json(
        { error: 'Invalid request. No chat data provided.' },
        { status: 400 }
      );
    }
    
    console.log(`Saving chat ${chat.id} for user ${user.id}`);
    
    // Check if chat already exists (update) or needs to be created
    const existingChat = await prisma.chat.findUnique({
      where: {
        id: chat.id,
      },
    });
    
    if (existingChat) {
      // Update existing chat
      const updatedChat = await prisma.chat.update({
        where: {
          id: chat.id,
        },
        data: {
          title: chat.title,
          modelId: chat.modelId,
          updatedAt: new Date(),
          messages: {
            deleteMany: {}, // Remove all existing messages
            create: chat.messages.map(message => ({
              id: message.id,
              content: message.content,
              role: message.role,
              modelId: message.modelId,
              createdAt: new Date(message.createdAt),
            })),
          },
        },
        include: {
          messages: true,
        },
      });
      
      return NextResponse.json({ success: true, chat: updatedChat });
    } else {
      // Create new chat
      const newChat = await prisma.chat.create({
        data: {
          id: chat.id,
          title: chat.title,
          modelId: chat.modelId,
          userId: user.id,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt),
          messages: {
            create: chat.messages.map(message => ({
              id: message.id,
              content: message.content,
              role: message.role,
              modelId: message.modelId,
              createdAt: new Date(message.createdAt),
            })),
          },
        },
        include: {
          messages: true,
        },
      });
      
      return NextResponse.json({ success: true, chat: newChat });
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 