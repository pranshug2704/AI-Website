import { Message } from '../types';

/**
 * Client-side API wrapper for making calls to AI models
 * This file contains safe browser-side code that calls server API routes
 */

// Stream AI response from the server
export async function* streamAIResponse(
  messages: Message[],
  modelId: string,
  temperature: number = 0.7
): AsyncGenerator<string, any, unknown> {
  try {
    // Prepare API request
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        modelId,
        temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get AI response');
    }

    // Ensure the response has a readable stream
    if (!response.body) {
      throw new Error('Response body is not readable');
    }

    // Read the stream from the server
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      
      if (done) {
        break;
      }
      
      // Decode and parse the chunk
      const chunk = decoder.decode(value);
      
      try {
        // Check if the chunk is a data event from Server-Sent Events
        if (chunk.startsWith('data:')) {
          const jsonStr = chunk.slice(5).trim();
          
          // If it's the [DONE] event, break the loop
          if (jsonStr === '[DONE]') {
            break;
          }
          
          if (jsonStr) {
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.text) {
                yield parsed.text;
              }
            } catch (e) {
              // If it's not valid JSON, just yield the raw text
              yield jsonStr;
            }
          }
        } else {
          // Handle plain text response
          yield chunk;
        }
      } catch (error) {
        console.error('Error parsing stream chunk:', error);
        // Just return the raw chunk if parsing fails
        yield chunk;
      }
    }

    return {
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      }
    };
  } catch (error) {
    console.error('Error streaming AI response:', error);
    throw error;
  }
}

// Get available models
export async function getAvailableProviders(): Promise<string[]> {
  try {
    const response = await fetch('/api/models/available');
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return data.providers || [];
  } catch (error) {
    console.error('Error getting available providers:', error);
    return [];
  }
} 