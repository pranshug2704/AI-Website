import { Chat, Message, AIModel } from '@/app/types';
import { generateChatTitle } from '@/app/lib/chat-utils';

export const useChatApi = () => {
  // Stream response from API
  const streamResponse = async (
    chat: Chat,
    aiMessage: Message,
    onUpdate: (updatedMessage: Message) => void,
    onComplete: (finalMessage: Message) => void,
    onError: (error: Error) => void,
    selectedModelId?: string
  ) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: chat.messages,
          modelId: selectedModelId,
        }),
      });
      
      if (!response.ok) {
        // Try to extract detailed error message from response
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            throw new Error(errorData.error);
          }
        } catch (parseError) {
          // If we can't parse the error JSON, fall back to status code
          console.error('Error parsing error response:', parseError);
        }
        
        throw new Error(`API error: ${response.status} - ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('Response body is null');
      }
      
      let aiContent = '';
      let modelId = selectedModelId;
      let usage = undefined;
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) {
            continue;
          }
          
          try {
            const jsonStr = line.replace('data: ', '');
            const data = JSON.parse(jsonStr);
            
            if (data.event === 'metadata') {
              // Handle metadata
              modelId = data.data.modelId;
            } else if (data.event === 'chunk') {
              // Handle content chunk
              aiContent += data.data.content;
              
              // Call the update callback with the updated message
              onUpdate({
                ...aiMessage,
                content: aiContent,
                modelId,
                loading: true,
              });
            } else if (data.event === 'usage') {
              // Handle usage information
              usage = data.data;
            } else if (data.event === 'error') {
              // Handle server-side error event
              let errorMsg = data.data.message || 'Unknown error from AI service';
              
              // Create more user-friendly error messages
              if (errorMsg.includes('API provider') && errorMsg.includes('not available')) {
                errorMsg = `${errorMsg} Please check your settings or try a different model.`;
              } else if (errorMsg.includes('API key')) {
                errorMsg = `The AI provider is not properly configured. ${errorMsg}`;
              }
              
              throw new Error(errorMsg);
            } else if (data.event === 'done') {
              // Handle stream completion
              const finalMessage = {
                ...aiMessage,
                content: aiContent || 'AI response completed but no content was generated.',
                modelId,
                usage,
                loading: false,
              };
              
              // Call the complete callback with the final message
              onComplete(finalMessage);
              return finalMessage;
            }
          } catch (error) {
            console.error('Error parsing SSE data:', error);
            throw error; // Rethrow to be caught by the outer catch
          }
        }
      }
      
      // If we reach here, the stream ended without a 'done' event
      const finalMessage = {
        ...aiMessage,
        content: aiContent || 'The AI response was cut off unexpectedly.',
        modelId,
        usage,
        loading: false,
      };
      
      onComplete(finalMessage);
      return finalMessage;
    } catch (error) {
      console.error('Error streaming response:', error);
      
      // Create a user-friendly error message
      let errorMessage = 'An error occurred while communicating with the AI service.';
      
      if (error instanceof Error) {
        // Extract the most user-friendly part of the error message
        if (error.message.includes('API key')) {
          errorMessage = 'The selected AI provider is not properly configured. Please try a different model.';
        } else if (error.message.includes('provider not available') || error.message.includes('AI provider')) {
          errorMessage = error.message;
        } else if (error.message.startsWith('API error:')) {
          errorMessage = error.message;
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      // Update the message with the error
      const errorResponse = {
        ...aiMessage,
        content: errorMessage,
        role: 'error' as const,
        loading: false,
      };
      
      onError(new Error(errorMessage));
      
      // Also update the UI with the error message
      onComplete(errorResponse);
      
      throw error;
    }
  };

  // Generate a chat title based on the first few messages
  const generateTitle = async (chatId: string, messages: Message[]): Promise<string> => {
    if (messages.length < 1) return 'New Chat';

    try {
      // First try to get a title from the API
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
        // Fall back to local title generation if API fails
        return generateChatTitle(messages[0].content);
      }

      const data = await response.json();
      return data.title || generateChatTitle(messages[0].content);
    } catch (error) {
      console.error('Error generating chat title:', error);
      return generateChatTitle(messages[0].content);
    }
  };

  return {
    streamResponse,
    generateTitle,
  };
}; 