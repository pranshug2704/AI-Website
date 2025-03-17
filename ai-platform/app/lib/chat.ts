import { Chat, Message } from '@/app/types';
import prisma from './prisma';

// Get chat by ID
export async function getChat(chatId: string, validateUserId?: string): Promise<Chat | null> {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  });

  if (!chat) return null;
  
  // If a user ID is provided, validate that this user owns the chat
  if (validateUserId && chat.userId !== validateUserId) {
    return null;
  }

  return {
    id: chat.id,
    title: chat.title,
    messages: chat.messages.map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system' | 'error',
      content: m.content,
      createdAt: m.createdAt,
      modelId: m.modelId || undefined,
      usage: m.totalTokens ? {
        promptTokens: m.promptTokens || 0,
        completionTokens: m.completionTokens || 0,
        totalTokens: m.totalTokens
      } : undefined,
    })),
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    modelId: chat.modelId || undefined,
    userId: chat.userId
  };
}

// Get all chats for a user
export async function getUserChats(userId: string): Promise<Chat[]> {
  const chats = await prisma.chat.findMany({
    where: { userId },
    include: { 
      messages: { 
        take: 1, // Only get first message for preview
        orderBy: { createdAt: 'asc' } 
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return chats.map(chat => ({
    id: chat.id,
    title: chat.title,
    messages: chat.messages.map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system' | 'error',
      content: m.content,
      createdAt: m.createdAt,
      modelId: m.modelId || undefined,
      usage: m.totalTokens ? {
        promptTokens: m.promptTokens || 0,
        completionTokens: m.completionTokens || 0,
        totalTokens: m.totalTokens
      } : undefined,
    })),
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    modelId: chat.modelId || undefined,
    userId: chat.userId
  }));
}

// Create a new chat
export async function createChat(userId: string, title: string, modelId?: string): Promise<Chat> {
  const chat = await prisma.chat.create({
    data: {
      title,
      modelId,
      userId
    }
  });

  return {
    id: chat.id,
    title: chat.title,
    messages: [],
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    modelId: chat.modelId || undefined,
    userId: chat.userId
  };
}

// Add a message to a chat
export async function addMessage(
  chatId: string, 
  message: Omit<Message, 'id' | 'createdAt'>,
  validateUserId?: string
): Promise<Message> {
  // First, check if the chat exists and belongs to the user (if validateUserId is provided)
  const chat = await prisma.chat.findUnique({ 
    where: { id: chatId } 
  });
  
  if (!chat) {
    throw new Error(`Chat with ID ${chatId} not found`);
  }
  
  if (validateUserId && chat.userId !== validateUserId) {
    throw new Error('You do not have permission to add messages to this chat');
  }
  
  // Create the message
  const newMessage = await prisma.message.create({
    data: {
      role: message.role,
      content: message.content,
      chatId: chatId,
      modelId: message.modelId,
      promptTokens: message.usage?.promptTokens,
      completionTokens: message.usage?.completionTokens,
      totalTokens: message.usage?.totalTokens
    }
  });
  
  // Update the chat's updatedAt timestamp
  await prisma.chat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() }
  });
  
  return {
    id: newMessage.id,
    role: newMessage.role as 'user' | 'assistant' | 'system' | 'error',
    content: newMessage.content,
    createdAt: newMessage.createdAt,
    modelId: newMessage.modelId || undefined,
    usage: newMessage.totalTokens ? {
      promptTokens: newMessage.promptTokens || 0,
      completionTokens: newMessage.completionTokens || 0,
      totalTokens: newMessage.totalTokens
    } : undefined
  };
}

// Delete a chat
export async function deleteChat(chatId: string, validateUserId?: string): Promise<boolean> {
  try {
    // First, check if the chat exists and belongs to the user (if validateUserId is provided)
    if (validateUserId) {
      const chat = await prisma.chat.findUnique({ 
        where: { id: chatId } 
      });
      
      if (!chat) {
        return false;
      }
      
      if (chat.userId !== validateUserId) {
        throw new Error('You do not have permission to delete this chat');
      }
    }
    
    // Delete the chat (this will cascade delete all messages)
    await prisma.chat.delete({
      where: { id: chatId }
    });
    
    return true;
  } catch (error) {
    console.error(`Error deleting chat ${chatId}:`, error);
    return false;
  }
}

// Clear all messages in a chat
export async function clearChat(chatId: string, validateUserId?: string): Promise<boolean> {
  try {
    // First, check if the chat exists and belongs to the user (if validateUserId is provided)
    if (validateUserId) {
      const chat = await prisma.chat.findUnique({ 
        where: { id: chatId } 
      });
      
      if (!chat) {
        return false;
      }
      
      if (chat.userId !== validateUserId) {
        throw new Error('You do not have permission to clear this chat');
      }
    }
    
    // Delete all messages in the chat
    await prisma.message.deleteMany({
      where: { chatId }
    });
    
    // Update the chat's updatedAt timestamp
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() }
    });
    
    return true;
  } catch (error) {
    console.error(`Error clearing chat ${chatId}:`, error);
    return false;
  }
}

/**
 * Generates a chat title based on the first message content
 * This is a simple implementation that would be replaced with AI-based title generation in production
 */
export function generateChatTitle(content: string): string {
  if (!content || typeof content !== 'string') {
    return 'New Chat';
  }
  
  // Simple version that truncates the first message
  const title = content.trim();
  
  if (title.length < 30) {
    return title;
  }
  
  return title.substring(0, 30) + '...';
}

/**
 * Helper to format chat timestamp
 */
export function formatChatTime(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  
  // Return "HH:MM AM/PM" format
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Helper to format chat date
 */
export function formatChatDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Return "Today", "Yesterday", or "Month Day, Year"
  if (d.toDateString() === now.toDateString()) {
    return 'Today';
  }
  
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Group messages by date for display
 */
export function groupMessagesByDate(messages: Message[]): Record<string, Message[]> {
  const grouped: Record<string, Message[]> = {};
  
  messages.forEach(message => {
    const dateKey = formatChatDate(message.createdAt);
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    
    grouped[dateKey].push(message);
  });
  
  return grouped;
}

/**
 * Extracts only the user messages from a message array
 */
export function extractUserMessages(messages: Message[]): Message[] {
  return messages.filter(message => message.role === 'user');
}

/**
 * Estimates token usage based on character count (very rough approximation)
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  
  // Rough estimation: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

/**
 * Gets the total tokens used in a chat
 */
export function getTotalTokensUsed(messages: Message[]): number {
  return messages.reduce((total, message) => {
    if (message.usage) {
      return total + message.usage.totalTokens;
    }
    
    // Fallback to estimation if usage data is not available
    return total + estimateTokens(message.content);
  }, 0);
}

/**
 * Serializes a chat for export
 */
export function serializeChat(messages: Message[], format: 'text' | 'markdown' = 'text'): string {
  if (format === 'markdown') {
    return messages.map(message => {
      const role = message.role === 'user' ? 'User' : message.role === 'assistant' ? 'Assistant' : 'System';
      const timestamp = formatChatTime(message.createdAt);
      
      return `## ${role} (${timestamp}):\n\n${message.content}\n\n`;
    }).join('---\n\n');
  }
  
  // Plain text format
  return messages.map(message => {
    const role = message.role === 'user' ? 'User' : message.role === 'assistant' ? 'Assistant' : 'System';
    const timestamp = formatChatTime(message.createdAt);
    
    return `${role} (${timestamp}):\n${message.content}\n\n`;
  }).join('');
}

// Export chat as text
export async function exportChatAsText(chatId: string, validateUserId?: string): Promise<string> {
  const chat = await getChat(chatId, validateUserId);
  if (!chat) {
    throw new Error(`Chat with ID ${chatId} not found or you don't have access`);
  }
  
  let output = `# ${chat.title}\n\n`;
  
  for (const message of chat.messages) {
    const sender = message.role === 'user' ? 'You' : 'AI';
    output += `${sender}: ${message.content}\n\n`;
  }
  
  return output;
}

// Export chat as markdown
export async function exportChatAsMarkdown(chatId: string, validateUserId?: string): Promise<string> {
  const chat = await getChat(chatId, validateUserId);
  if (!chat) {
    throw new Error(`Chat with ID ${chatId} not found or you don't have access`);
  }
  
  let output = `# ${chat.title}\n\n`;
  
  for (const message of chat.messages) {
    const sender = message.role === 'user' ? '**You**' : `**AI** (${message.modelId || 'Auto'})`;
    output += `### ${sender}\n\n${message.content}\n\n`;
    
    if (message.usage) {
      output += `_Tokens: ${message.usage.totalTokens} (${message.usage.promptTokens} prompt, ${message.usage.completionTokens} completion)_\n\n`;
    }
  }
  
  return output;
}

// Update user's total token usage
export async function updateUserTokenUsage(userId: string, tokens: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { usageTotal: { increment: tokens } }
  });
}