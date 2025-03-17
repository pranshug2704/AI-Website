import 'server-only';
import { Message } from '../types';
import { getModelById } from './models';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { isProviderAvailable } from './server-utils';
// Import Mistral statically to avoid ESM issues
import MistralClient from '@mistralai/mistralai';

// Define TokenUsage type since it's not exported from types.ts
type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

// Initialize clients - these will only run on the server
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const googleAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Initialize Mistral client directly if API key is available
let mistral: any = null;
if (process.env.MISTRAL_API_KEY) {
  try {
    mistral = new MistralClient(process.env.MISTRAL_API_KEY);
    console.log('Mistral AI client initialized directly');
  } catch (error) {
    console.error('Failed to initialize Mistral AI client:', error);
    mistral = null;
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

    // Add debug log to check API key (only showing first/last few chars for security)
    const apiKey = process.env.OPENAI_API_KEY || '';
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
    const model = googleAI.getGenerativeModel({ model: modelId });
    
    // Convert our message format to Google's chat format
    const chatHistory: any[] = [];
    let systemMessage = '';
    
    messages.forEach(msg => {
      if (msg.role === 'system') {
        systemMessage += msg.content + '\n';
      } else {
        chatHistory.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
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
    const result = await chat.sendMessageStream(lastMessage.parts[0].text);
    
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
  
  // Check if Mistral client is available
  if (!mistral) {
    console.error('Mistral API client not initialized. Please provide a valid API key.');
    
    // Check if the API key is available but client failed
    if (process.env.MISTRAL_API_KEY) {
      console.error('Mistral API key is present but client failed to initialize.');
      // Log the first and last 4 characters of the key for verification
      const key = process.env.MISTRAL_API_KEY;
      const sanitizedKey = key.length > 8 
        ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
        : '[invalid key]';
      console.log(`Mistral API key starts with: ${sanitizedKey}`);
      
      // Try to initialize one more time
      try {
        mistral = new MistralClient(process.env.MISTRAL_API_KEY);
        console.log('Mistral AI client initialized on demand');
      } catch (error) {
        console.error('Failed to initialize Mistral AI client on demand:', error);
        mistral = null;
      }
    }
    
    if (!mistral) {
      throw new Error('Mistral API not available. Please use a different AI provider.');
    }
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

// Main function to route to the correct API provider
export async function* streamAIResponse(
  messages: Message[],
  modelId: string,
  temperature: number = 0.7
): AsyncGenerator<string, { usage: TokenUsage }, unknown> {
  const model = getModelById(modelId);
  if (!model) {
    throw new Error(`Model with ID ${modelId} not found`);
  }
  
  console.log(`Routing request to model provider: ${model.provider} (${modelId})`);
  
  // Check if the provider is available before attempting to use it
  const provider = model.provider.toLowerCase();
  if (!isProviderAvailable(provider)) {
    throw new Error(
      `The selected AI provider (${model.provider}) is not available. ` +
      `Please set up a valid API key for ${model.provider} or select a different model.`
    );
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
    throw new Error(`Unsupported model provider for ID: ${modelId}`);
  }
}