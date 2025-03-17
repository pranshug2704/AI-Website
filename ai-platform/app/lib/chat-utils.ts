import { Message } from '@/app/types';

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