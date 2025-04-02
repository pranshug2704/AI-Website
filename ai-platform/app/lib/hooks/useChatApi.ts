import { Chat, Message, AIModel } from '@/app/types';
import { generateChatTitle } from '@/app/lib/chat-utils';

// Extended Message type to include properties for tracking API interactions
interface ExtendedMessage extends Message {
  provider?: string;
  tokenUsage?: any;
  completed?: boolean;
}

export const useChatApi = () => {
  // Stream response from API
  const streamResponse = async (
    chat: Chat,
    message: ExtendedMessage,
    onUpdate: (message: ExtendedMessage) => void,
    onComplete: (message: ExtendedMessage) => void,
    onError: (error: Error) => void,
    selectedModelId?: string
  ) => {
    try {
      // Prepare messages for the API
      const apiMessages = chat.messages.map(msg => ({
        ...msg,
        // Keep images for user messages only - they're the only ones that can have images
        images: msg.role === 'user' ? msg.images : undefined
      }));
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          modelId: selectedModelId || chat.modelId,
        }),
      });
      
      // Check for successful response and body
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('API request failed:', response.status, errorBody);
        throw new Error(`API request failed with status ${response.status}: ${errorBody || response.statusText}`);
      }
      
      if (!response.body) {
        throw new Error('Response body is missing');
      }

      // Set up event source
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let receivedMessage = '';
      
      // Variables to store model information
      let modelId = selectedModelId || chat.modelId;
      let modelName = '';
      
      // Define providers that need API keys
      const providersRequiringKeys = ['openai', 'anthropic', 'google', 'mistral'];
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          
          // Try to parse the chunk as JSON first
          try {
            const parsedChunk = JSON.parse(chunk);
            if (parsedChunk.text) {
              // If it's a text chunk, update immediately with just the new chunk
              receivedMessage += parsedChunk.text;
              onUpdate({ ...message, content: receivedMessage });
            } else if (parsedChunk.usage) {
              // If it's usage information, store it
              console.log('[useChatApi] Received usage information:', parsedChunk.usage);
            }
          } catch (e) {
            // If it's not JSON, treat it as raw text
            // Split the chunk into lines to handle potential line breaks
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.trim()) {
                // Send each line immediately
                receivedMessage += line + '\n';
                onUpdate({ ...message, content: receivedMessage });
              }
            }
          }
        }
      }
      
      // Format final message content properly
      if (!receivedMessage.trim()) {
        console.warn('[useChatApi] Stream ended but receivedMessage was empty.')
        receivedMessage = "I couldn't generate a response. Please try again or select a different model.";
      }
      
      // Complete the message with model information
      onComplete({
        ...message,
        content: receivedMessage,
        loading: false,
        completed: true,
        modelId: modelId,
      });
      
    } catch (error) {
      console.error('Stream response error:', error);
      
      // Create user-friendly error message
      let errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      // Make messages more user-friendly based on error content
      if (errorMessage.includes('API key')) {
        // If we captured the provider earlier, use it in the message
        const provider = message.provider || 'selected AI provider';
        errorMessage = `The selected AI provider is not properly configured. Please try a different model or configure the ${provider} API key in your settings.`;
      } else if (errorMessage.includes('429') || errorMessage.includes('too many requests')) {
        errorMessage = 'The AI provider is experiencing high traffic. Please try again later.';
      } else if (errorMessage.includes('500')) {
        errorMessage = 'The AI provider encountered a server error. Please try again or select a different model.';
      }
      
      onError(new Error(errorMessage));
    }
  };

  // Generate a chat title based on the first few messages
  const generateTitle = async (chatId: string, messages: Message[]): Promise<string> => {
    if (messages.length < 1) return 'New Chat';

    try {
      console.log(`[useChatApi] Generating title for chat ${chatId} with ${messages.length} messages`);
      
      // Get the first user message
      const userMessage = messages.find(m => m.role === 'user');
      if (!userMessage) {
        console.log(`[useChatApi] No user message found, using default title`);
        return 'New Chat';
      }
      
      console.log(`[useChatApi] First message content: "${userMessage.content.substring(0, 50)}..."`);
      
      // First try to directly use message content to create title
      let title = '';
      if (userMessage.content && userMessage.content.trim().length > 0) {
        const content = userMessage.content.trim();
        title = content.length > 30 ? content.substring(0, 30) + '...' : content;
        console.log(`[useChatApi] Created title directly from content: "${title}"`);
      }
      
      // Only call API if title is still empty
      if (!title) {
        // Call the API to generate a title
        console.log(`[useChatApi] Calling API endpoint /api/chat/title for chat ${chatId}`);
        const response = await fetch('/api/chat/title', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId,
            messages: messages.slice(0, 2), // Just use the first couple messages
          }),
        });

        if (!response.ok) {
          console.log(`[useChatApi] API title generation failed with status ${response.status}, falling back to client-side generation`);
          // Fall back to local title generation if API fails
          const fallbackTitle = generateChatTitle(userMessage.content);
          console.log(`[useChatApi] Generated fallback title: "${fallbackTitle}"`);
          return fallbackTitle;
        }

        const data = await response.json();
        console.log(`[useChatApi] Generated title from API: "${data.title}"`);
        title = data.title;
      }
      
      // Direct database update regardless of API call, to ensure it's saved
      console.log(`[useChatApi] Directly updating chat ${chatId} with title "${title}" in database`);
      const updateResponse = await fetch('/api/chat/updateTitle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          title: title || userMessage.content.substring(0, 30) + '...'
        }),
      });
      
      if (!updateResponse.ok) {
        console.error(`[useChatApi] Failed to update title directly in database: ${updateResponse.status}`);
      } else {
        console.log(`[useChatApi] Successfully updated title in database`);
      }
      
      // Return the title
      return title || userMessage.content.substring(0, 30) + '...';
    } catch (error) {
      console.error('[useChatApi] Error generating chat title:', error);
      // Use the content of the first message as a fallback
      if (messages.length > 0 && messages[0].content) {
        const fallbackTitle = messages[0].content.substring(0, 30) + '...';
        console.log(`[useChatApi] Error occurred, using message content as title: "${fallbackTitle}"`);
        return fallbackTitle;
      }
      return 'New Chat';
    }
  };

  return {
    streamResponse,
    generateTitle,
  };
}; 