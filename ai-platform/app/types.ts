// AI model types
export type AIModel = {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  tier: 'free' | 'pro' | 'enterprise';
  icon?: string;
  apiKey?: string;
  maxTokens?: number;
  description?: string;
}

// User subscription tiers
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

// API request type
export type AIRequest = {
  prompt: string;
  modelId?: string;
  options?: {
    temperature?: number;
    maxTokens?: number;
    format?: 'text' | 'json' | 'markdown';
  };
  images?: ImageContent[];
}

// API response type
export type AIResponse = {
  id: string;
  result: string;
  modelUsed: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }
  createdAt: string;
}

// Content types for messages
export type MessageContentType = 'text' | 'image' | 'markdown' | 'multipart';

// Image content for messages
export interface ImageContent {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  data?: string; // base64 encoded image data
}

// Message types for chat
export type MessageRole = 'user' | 'assistant' | 'system' | 'error';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  contentType?: MessageContentType;
  images?: ImageContent[];
  createdAt: Date;
  modelId?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  loading?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  modelId?: string;
  userId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  subscription: SubscriptionTier;
  // For mock auth system
  usage?: {
    totalTokens: number;
    limit: number;
  };
  // For real auth system with database fields
  usageTotal?: number;
  usageLimit?: number;
}

// Task types for model routing
export type TaskType = 'general' | 'code' | 'math' | 'creative' | 'vision';

// AI Provider types
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'mistral';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}