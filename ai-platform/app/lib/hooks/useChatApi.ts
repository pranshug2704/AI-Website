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
      
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // If JSON parsing fails, provide a more specific error based on status code
          if (response.status === 401) {
            errorMessage = "Authentication error. Please log in again.";
          } else if (response.status === 403) {
            errorMessage = "You've reached your usage limit. Please upgrade your plan.";
          }
        }
        
        throw new Error(errorMessage);
      }

      // Set up event source
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }
      
      let receivedMessage = '';
      let decoder = new TextDecoder();
      let done = false;
      
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
          const lines = chunk.split('\n\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const parsedData = JSON.parse(data);
                
                // Handle different event types
                switch (parsedData.event) {
                  case 'metadata':
                    console.log('Model metadata:', parsedData.data);
                    // Store model information
                    if (parsedData.data.modelId) modelId = parsedData.data.modelId;
                    if (parsedData.data.modelName) modelName = parsedData.data.modelName;
                    // Check if this provider requires an API key
                    const provider = parsedData.data.provider.toLowerCase();
                    if (providersRequiringKeys.includes(provider)) {
                      // This will be used later if we get an error
                      message.provider = provider;
                    }
                    break;
                    
                  case 'chunk':
                    receivedMessage += parsedData.data.content;
                    onUpdate({
                      ...message,
                      content: receivedMessage,
                    });
                    break;
                    
                  case 'usage':
                    console.log('Token usage:', parsedData.data);
                    message.tokenUsage = parsedData.data;
                    break;
                    
                  case 'error':
                    let errorMsg = parsedData.data.message || 'Unknown error occurred';
                    
                    // Enhance error messages with provider context if available
                    if (message.provider) {
                      if (errorMsg.includes('API key')) {
                        errorMsg = `The ${message.provider} API key is missing or invalid. Please configure it in your settings.`;
                      } else if (errorMsg.includes('not available')) {
                        errorMsg = `The ${message.provider} service is currently not available. Please try another model.`;
                      }
                    }
                    
                    throw new Error(errorMsg);
                    
                  case 'done':
                    done = true;
                    break;
                    
                  default:
                    console.log('Unknown event type:', parsedData.event);
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      }
      
      // Format final message content properly
      if (!receivedMessage.trim()) {
        receivedMessage = "I couldn't generate a response. Please try again or select a different model.";
      }
      
      // Complete the message with model information
      onComplete({
        ...message,
        content: receivedMessage,
        loading: false,
        completed: true,
        modelId: modelId, // Include the model ID
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