import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/server-auth';
import prisma from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  // Get session from NextAuth
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized. Please log in to access this feature.' },
      { status: 401 }
    );
  }
  
  try {
    const userId = user.id;
    
    // Check if a specific chat ID is requested
    const chatId = request.nextUrl.searchParams.get('id');
    
    if (chatId) {
      // Get a specific chat
      const chat = await prisma.chat.findUnique({
        where: {
          id: chatId,
          userId: userId // Ensure the chat belongs to the user
        },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });
      
      if (!chat) {
        return NextResponse.json(
          { error: 'Chat not found.' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ chat });
    } else {
      // Get all chats for the user
      const chats = await prisma.chat.findMany({
        where: {
          userId: userId
        },
        orderBy: {
          updatedAt: 'desc'
        },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });
      
      return NextResponse.json({ chats });
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Get session from NextAuth
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
    const { title, modelId } = body as { title: string, modelId?: string };
    const userId = user.id;
    
    if (!title) {
      return NextResponse.json(
        { error: 'Invalid request. Title is required.' },
        { status: 400 }
      );
    }
    
    // Create a new chat
    const chat = await prisma.chat.create({
      data: {
        id: `chat-${Date.now()}`,
        title,
        modelId,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });
    
    return NextResponse.json({ chat });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Get session from NextAuth
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized. Please log in to access this feature.' },
      { status: 401 }
    );
  }
  
  try {
    // Get chat ID from query params
    const chatId = request.nextUrl.searchParams.get('id');
    const userId = user.id;
    
    if (!chatId) {
      return NextResponse.json(
        { error: 'Invalid request. Chat ID is required.' },
        { status: 400 }
      );
    }
    
    // Delete the chat
    try {
      await prisma.message.deleteMany({
        where: {
          chatId
        }
      });
      
      await prisma.chat.delete({
        where: {
          id: chatId,
          userId // Ensure the chat belongs to the user
        }
      });
      
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting chat:', error);
      return NextResponse.json(
        { error: 'Chat not found or could not be deleted.' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // Get session from NextAuth
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
    const { chatId, action, format } = body as { chatId: string, action: 'clear' | 'export', format?: 'text' | 'markdown' };
    const userId = user.id;
    
    if (!chatId || !action) {
      return NextResponse.json(
        { error: 'Invalid request. Chat ID and action are required.' },
        { status: 400 }
      );
    }
    
    // Handle different actions
    if (action === 'clear') {
      try {
        // Clear all messages from the chat
        await prisma.message.deleteMany({
          where: {
            chatId,
            chat: {
              userId // Ensure the chat belongs to the user
            }
          }
        });
        
        return NextResponse.json({ success: true });
      } catch (error) {
        console.error('Error clearing chat:', error);
        return NextResponse.json(
          { error: 'Chat not found or could not be cleared.' },
          { status: 404 }
        );
      }
    } else if (action === 'export') {
      // Export chat
      const exportFormat = format || 'markdown';
      
      try {
        // Get the chat with messages
        const chat = await prisma.chat.findUnique({
          where: {
            id: chatId,
            userId // Ensure the chat belongs to the user
          },
          include: {
            messages: {
              orderBy: {
                createdAt: 'asc'
              }
            }
          }
        });
        
        if (!chat) {
          throw new Error('Chat not found');
        }
        
        let content: string;
        let contentType: string;
        let filename: string;
        
        if (exportFormat === 'markdown') {
          // Format as markdown
          content = `# ${chat.title}\n\n`;
          
          for (const message of chat.messages) {
            const role = message.role === 'user' ? 'User' : message.role === 'assistant' ? 'Assistant' : 'System';
            content += `## ${role}\n\n${message.content}\n\n`;
          }
          
          contentType = 'text/markdown';
          filename = `chat-${chatId}.md`;
        } else {
          // Format as plain text
          content = `${chat.title}\n\n`;
          
          for (const message of chat.messages) {
            const role = message.role === 'user' ? 'User' : message.role === 'assistant' ? 'Assistant' : 'System';
            content += `${role}:\n${message.content}\n\n`;
          }
          
          contentType = 'text/plain';
          filename = `chat-${chatId}.txt`;
        }
        
        return new NextResponse(content, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`
          }
        });
      } catch (error) {
        console.error('Error exporting chat:', error);
        return NextResponse.json(
          { error: 'Chat not found or could not be exported.' },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Supported actions: clear, export.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}