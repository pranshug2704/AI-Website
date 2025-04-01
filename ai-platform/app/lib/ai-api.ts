import 'server-only';
import { Message } from '../types';
import { getModelById } from './models';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { isProviderAvailable } from './server-utils';
// Import Mistral statically to avoid ESM issues
import MistralClient from '@mistralai/mistralai';
// Import API key cache
import { getCachedApiKeys } from '../api/keys/route';

// Define TokenUsage type since it's not exported from types.ts
type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

// Get API keys - supports both environment variables and cached values
function getApiKeys() {
  // Try to get from cache first
  try {
    return getCachedApiKeys();
  } catch (error) {
    console.log('Using environment variables for API keys (cache not available)');
    // Fall back to environment variables
    return {
      openai: process.env.OPENAI_API_KEY || '',
      anthropic: process.env.ANTHROPIC_API_KEY || '',
      google: process.env.GOOGLE_API_KEY || '',
      mistral: process.env.MISTRAL_API_KEY || ''
    };
  }
}

// Function to get an OpenAI client
function getOpenAIClient() {
  const keys = getApiKeys();
  return new OpenAI({
    apiKey: keys.openai,
  });
}

// Function to get an Anthropic client
function getAnthropicClient() {
  const keys = getApiKeys();
  return new Anthropic({
    apiKey: keys.anthropic,
  });
}

// Function to get a Google AI client
function getGoogleAIClient() {
  const keys = getApiKeys();
  if (!keys.google || keys.google.length < 30) {
    console.warn('Invalid or missing Google API key');
    return null;
  }
  
  try {
    return new GoogleGenerativeAI(keys.google);
  } catch (error) {
    console.error('Failed to initialize Google AI client:', error);
    return null;
  }
}

// Function to get a Mistral client
function getMistralClient() {
  const keys = getApiKeys();
  if (!keys.mistral) return null;
  
  try {
    return new MistralClient(keys.mistral);
  } catch (error) {
    console.error('Failed to initialize Mistral AI client:', error);
    return null;
  }
}

// Stream response from OpenAI
export async function* streamOpenAI(
  messages: Message[],
  modelId: string,
  temperature: number = 0.7
): AsyncGenerator<string, { usage: TokenUsage }, unknown> {
  try {
    console.log('Attempting to use OpenAI API with model:', modelId);
    
    const mappedMessages = messages.map(m => {
      if (m.role === 'user') {
        return { role: 'user', content: m.content };
      } else if (m.role === 'assistant') {
        return { role: 'assistant', content: m.content };
      } else {
        return { role: 'system', content: m.content };
      }
    });

    // Get fresh client for each request to use latest API key
    const openai = getOpenAIClient();
    
    // Add debug log to check API key (only showing first/last few chars for security)
    const keys = getApiKeys();
    const apiKey = keys.openai;
    const sanitizedKey = apiKey.length > 8 
      ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`
      : '[missing]';
    console.log(`OpenAI API key starts with: ${sanitizedKey}`);

    const stream = await openai.chat.completions.create({
      model: modelId,
      messages: mappedMessages,
      temperature,
      stream: true,
    });

    let content = '';
    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;

    for await (const chunk of stream) {
      const partialContent = chunk.choices[0]?.delta?.content || '';
      content += partialContent;
      
      if (partialContent) {
        yield partialContent;
        // OpenAI doesn't provide token counts in stream, estimate based on content
        completionTokens += partialContent.length / 4;
      }
    }

    // Estimate prompt tokens
    promptTokens = messages.reduce((acc, msg) => acc + msg.content.length / 4, 0);
    totalTokens = promptTokens + completionTokens;

    return {
      usage: {
        promptTokens: Math.ceil(promptTokens),
        completionTokens: Math.ceil(completionTokens),
        totalTokens: Math.ceil(totalTokens)
      }
    };
  } catch (error) {
    console.error('OpenAI streaming error:', error);
    throw error;
  }
}

// Stream response from Anthropic
export async function* streamAnthropic(
  messages: Message[],
  modelId: string,
  temperature: number = 0.7
): AsyncGenerator<string, { usage: TokenUsage }, unknown> {
  try {
    const mappedMessages = messages.map(m => {
      if (m.role === 'user') {
        return { role: 'user', content: m.content };
      } else if (m.role === 'assistant') {
        return { role: 'assistant', content: m.content };
      } else {
        // Anthropic only supports user and assistant roles
        return { role: 'user', content: `System: ${m.content}` };
      }
    });
    
    // Get fresh client for each request
    const anthropic = getAnthropicClient();
    const keys = getApiKeys();
    console.log(`Using Anthropic API key (present: ${!!keys.anthropic})`);
    
    const stream = await anthropic.messages.create({
      model: modelId,
      messages: mappedMessages,
      temperature,
      stream: true,
      max_tokens: 4096
    });

    let content = '';
    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.text) {
        content += chunk.delta.text;
        yield chunk.delta.text;
        
        // Anthropic doesn't provide token counts in stream, estimate based on content
        completionTokens += chunk.delta.text.length / 4;
      }
    }

    // Estimate prompt tokens
    promptTokens = messages.reduce((acc, msg) => acc + msg.content.length / 4, 0);
    totalTokens = promptTokens + completionTokens;

    return {
      usage: {
        promptTokens: Math.ceil(promptTokens),
        completionTokens: Math.ceil(completionTokens),
        totalTokens: Math.ceil(totalTokens)
      }
    };
  } catch (error) {
    console.error('Anthropic streaming error:', error);
    throw error;
  }
}

// Stream response from Google Gemini
export async function* streamGoogle(
  messages: Message[],
  modelId: string,
  temperature: number = 0.7
): AsyncGenerator<string, { usage: TokenUsage }, unknown> {
  try {
    // Get fresh client for each request
    const googleAI = getGoogleAIClient();
    
    // Verify Google AI client is properly initialized
    if (!googleAI) {
      console.error('Google AI client not initialized. Check API key configuration.');
      throw new Error('Google AI services are not available. Please check your API key configuration.');
    }
    
    const model = googleAI.getGenerativeModel({ model: modelId });
    
    // Add debug logging for the Google API request
    console.log(`Attempting Google API request with model: ${modelId}`);
    const keys = getApiKeys();
    console.log(`Using Google API key (present: ${!!keys.google}, length: ${keys.google?.length || 0})`);
    
    // Convert our message format to Google's chat format
    const chatHistory: any[] = [];
    let systemMessage = '';
    
    messages.forEach(msg => {
      if (msg.role === 'system') {
        systemMessage += msg.content + '\n';
      } else {
        // Create message parts array
        const parts: any[] = [];
        
        // Add text content if not empty
        if (msg.content.trim()) {
          parts.push({ text: msg.content });
          // Log for debugging
          if (msg.role === 'user' && msg.images && msg.images.length > 0) {
            console.log('Adding text content to message with images:', msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''));
          }
        }
        
        // Add images if present
        if (msg.images && msg.images.length > 0 && msg.role === 'user') {
          console.log(`Adding ${msg.images.length} images to message parts`);
          msg.images.forEach((img, index) => {
            if (img.data) {
              // For base64 data
              console.log(`Adding image ${index + 1} with data length: ${img.data.length}`);
              parts.push({
                inlineData: {
                  data: img.data,
                  mimeType: img.mimeType || 'image/jpeg'
                }
              });
            } else if (img.url) {
              // For image URLs
              console.log(`Adding image ${index + 1} with URL: ${img.url}`);
              parts.push({
                fileData: {
                  fileUri: img.url,
                  mimeType: img.mimeType || 'image/jpeg'
                }
              });
            }
          });
        }
        
        if (parts.length > 0) {
          chatHistory.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts
          });
        }
      }
    });
    
    // If there's a system message, prepend it to the first user message
    if (systemMessage && chatHistory.length > 0) {
      const firstUserIndex = chatHistory.findIndex(msg => msg.role === 'user');
      if (firstUserIndex >= 0) {
        chatHistory[firstUserIndex].parts[0].text = 
          `${systemMessage}\n\n${chatHistory[firstUserIndex].parts[0].text}`;
      }
    }
    
    const chat = model.startChat({
      history: chatHistory.slice(0, -1),
      generationConfig: {
        temperature
      }
    });
    
    const lastMessage = chatHistory[chatHistory.length - 1];
    let result;

    if (lastMessage.parts.length > 1) {
      // If we have multiple parts (text and images), send the parts directly
      result = await chat.sendMessageStream(lastMessage.parts);
    } else {
      // Otherwise just send the text
      result = await chat.sendMessageStream(lastMessage.parts[0].text);
    }
    
    let content = '';
    let promptTokens = 0;
    let completionTokens = 0;
    
    for await (const chunk of result.stream) {
      const text = chunk.text();
      content += text;
      yield text;
      
      // Google doesn't provide token counts in stream, estimate based on content
      completionTokens += text.length / 4;
    }
    
    // Estimate prompt tokens
    promptTokens = messages.reduce((acc, msg) => acc + msg.content.length / 4, 0);
    const totalTokens = promptTokens + completionTokens;
    
    return {
      usage: {
        promptTokens: Math.ceil(promptTokens),
        completionTokens: Math.ceil(completionTokens),
        totalTokens: Math.ceil(totalTokens)
      }
    };
  } catch (error) {
    console.error('Google streaming error:', error);
    throw error;
  }
}

// Stream response from Mistral
export async function* streamMistral(
  messages: Message[],
  modelId: string,
  temperature: number = 0.7
): AsyncGenerator<string, { usage: TokenUsage }, unknown> {
  console.log('Attempting to use Mistral API with model:', modelId);
  
  // Get fresh client for each request
  const mistral = getMistralClient();
  
  // Check if Mistral client is available
  if (!mistral) {
    console.error('Mistral API client not initialized. Please provide a valid API key.');
    
    // Check if the API key is available but client failed
    const keys = getApiKeys();
    if (keys.mistral) {
      console.error('Mistral API key is present but client failed to initialize.');
      // Log the first and last 4 characters of the key for verification
      const key = keys.mistral;
      const sanitizedKey = key.length > 8 
        ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
        : '[invalid key]';
      console.log(`Mistral API key starts with: ${sanitizedKey}`);
      
      // Try to initialize one more time
      try {
        const retryMistral = new MistralClient(keys.mistral);
        console.log('Mistral AI client initialized on demand');
        
        // If we succeed, use this client
        if (retryMistral) {
          const mappedMessages = messages.map(m => ({
            role: m.role === 'user' ? 'user' : m.role === 'assistant' ? 'assistant' : 'system',
            content: m.content
          }));
      
          const response = await retryMistral.chatStream({
            model: modelId,
            messages: mappedMessages,
            temperature: temperature,
            maxTokens: 2048,
          });
      
          let content = '';
          let promptTokens = 0;
          let completionTokens = 0;
      
          for await (const chunk of response) {
            if (chunk.type === 'content_block_delta') {
              const text = chunk.delta?.text || '';
              content += text;
              yield text;
              
              // Mistral doesn't provide token counts in stream, estimate based on content
              completionTokens += text.length / 4;
            }
          }
          
          // Estimate prompt tokens
          promptTokens = messages.reduce((acc, msg) => acc + msg.content.length / 4, 0);
          const totalTokens = promptTokens + completionTokens;
          
          return {
            usage: {
              promptTokens: Math.ceil(promptTokens),
              completionTokens: Math.ceil(completionTokens),
              totalTokens: Math.ceil(totalTokens)
            }
          };
        }
      } catch (error) {
        console.error('Failed to initialize Mistral AI client on demand:', error);
      }
    }
    
    throw new Error('Mistral API not available. Please use a different AI provider.');
  }

  try {
    const mappedMessages = messages.map(m => ({
      role: m.role === 'user' ? 'user' : m.role === 'assistant' ? 'assistant' : 'system',
      content: m.content
    }));

    const response = await mistral.chatStream({
      model: modelId,
      messages: mappedMessages,
      temperature: temperature,
      maxTokens: 2048,
    });

    let content = '';
    let promptTokens = 0;
    let completionTokens = 0;

    for await (const chunk of response) {
      if (chunk.type === 'content_block_delta') {
        const text = chunk.delta?.text || '';
        content += text;
        yield text;
        
        // Mistral doesn't provide token counts in stream, estimate based on content
        completionTokens += text.length / 4;
      }
    }
    
    // Estimate prompt tokens
    promptTokens = messages.reduce((acc, msg) => acc + msg.content.length / 4, 0);
    const totalTokens = promptTokens + completionTokens;
    
    return {
      usage: {
        promptTokens: Math.ceil(promptTokens),
        completionTokens: Math.ceil(completionTokens),
        totalTokens: Math.ceil(totalTokens)
      }
    };
  } catch (error) {
    console.error('Mistral streaming error:', error);
    throw error;
  }
}

// Helper function to check if Ollama is available
export async function isOllamaAvailable(): Promise<boolean> {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      // Check if we got a valid response with models
      if (data && data.models && Array.isArray(data.models)) {
        console.log(`Ollama detected with ${data.models.length} models available`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking Ollama availability:', error);
    return false;
  }
}

// Get available Ollama models
export async function getAvailableOllamaModels(): Promise<string[]> {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.models && Array.isArray(data.models)) {
        return data.models.map((model: any) => model.name);
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    return [];
  }
}

// Stream response from Ollama
export async function* streamOllama(
  messages: Message[],
  modelId: string,
  temperature: number = 0.7
): AsyncGenerator<string, { usage: TokenUsage }, unknown> {
  try {
    console.log('Attempting to use Ollama API with model:', modelId);
    
    // Extract the actual model name from the ID
    // Format is ollama:modelname
    const modelName = modelId.split(':')[1] || modelId;
    
    // Map our messages to Ollama's format
    const ollamaMessages = messages.map(m => ({
      role: m.role === 'system' ? 'system' : m.role === 'user' ? 'user' : 'assistant', 
      content: m.content
    }));
    
    // Configure Ollama API URL
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    
    // Send request to Ollama
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        messages: ollamaMessages,
        stream: true,
        options: {
          temperature
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }
    
    // Ensure the body is readable
    if (!response.body) {
      throw new Error('Ollama API returned an unreadable response');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let content = '';
    let promptTokens = 0;
    let completionTokens = 0;
    
    try {
      // Read from the stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        // Decode and process the chunk
        const chunk = decoder.decode(value);
        
        // Ollama returns JSONL - each line is a complete JSON object
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            
            if (parsed.message?.content) {
              const newContent = parsed.message.content;
              content += newContent;
              completionTokens += newContent.length / 4; // Rough estimation
              yield newContent;
            }
            
            // If we have eval_count, use it for token estimation
            if (parsed.eval_count) {
              completionTokens = parsed.eval_count;
            }
          } catch (e) {
            console.error('Error parsing Ollama response:', e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    // Estimate prompt tokens
    promptTokens = messages.reduce((acc, msg) => acc + msg.content.length / 4, 0);
    
    return {
      usage: {
        promptTokens: Math.ceil(promptTokens),
        completionTokens: Math.ceil(completionTokens),
        totalTokens: Math.ceil(promptTokens + completionTokens)
      }
    };
  } catch (error) {
    console.error('Ollama streaming error:', error);
    throw error;
  }
}

// Helper function to stream responses from any AI provider
export async function* streamAIResponse(
  messages: Message[],
  modelId: string,
  temperature: number = 0.7
): AsyncGenerator<string, { usage: TokenUsage }, unknown> {
  if (!modelId) {
    throw new Error('No model ID provided');
  }
  
  console.log(`Streaming AI response for model: ${modelId}`);
  
  // Get API keys to determine what's available
  const keys = getCachedApiKeys();
  const hasOpenAI = !!keys.openai && keys.openai.length > 20;
  const hasGoogle = !!keys.google && keys.google.length >= 30;
  const hasAnthropic = !!keys.anthropic && keys.anthropic.length > 20;
  const hasMistral = !!keys.mistral && keys.mistral.length > 20;
  
  // Check if this is an Ollama model first
  if (modelId.startsWith('ollama:')) {
    return yield* streamOllama(messages, modelId, temperature);
  }
  
  // Handle other models as before
  // If only Google key is available but trying to use a non-Google model, force using gemini-pro
  if (hasGoogle && !hasOpenAI && !hasAnthropic && !hasMistral) {
    if (!modelId.startsWith('gemini-')) {
      console.log(`Only Google API key is available but model ${modelId} was requested. Forcing use of gemini-pro instead.`);
      modelId = 'gemini-pro';
    }
  }
  
  if (modelId.startsWith('gpt-')) {
    return yield* streamOpenAI(messages, modelId, temperature);
  } else if (modelId.startsWith('claude-')) {
    return yield* streamAnthropic(messages, modelId, temperature);
  } else if (modelId.startsWith('gemini-')) {
    return yield* streamGoogle(messages, modelId, temperature);
  } else if (modelId.startsWith('mistral-')) {
    return yield* streamMistral(messages, modelId, temperature);
  } else {
    throw new Error(`Unsupported model: ${modelId}`);
  }
}

// Detect available models for the given Google API key
export async function detectGoogleModels(): Promise<string[]> {
  try {
    const googleAI = getGoogleAIClient();
    if (!googleAI) {
      console.warn('Cannot detect Google models: Invalid or missing API key');
      return [];
    }
    
    // Unfortunately, the Google Generative AI SDK doesn't have a listModels method
    // We'll check if we can create a model instance for common models to verify availability
    const commonModels = ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    const availableModels: string[] = [];
    
    for (const modelId of commonModels) {
      try {
        // Try to create a model instance - this will throw if the model isn't available
        const model = googleAI.getGenerativeModel({ model: modelId });
        
        // If we get here, the model is available
        console.log(`Verified Google model available: ${modelId}`);
        availableModels.push(modelId);
      } catch (error) {
        console.log(`Google model not available: ${modelId}`, error);
      }
    }
    
    // Return the verified models
    return availableModels;
  } catch (error) {
    console.error('Error detecting Google models:', error);
    return [];
  }
}