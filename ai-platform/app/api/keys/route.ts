import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/server-auth';
import prisma from '@/app/lib/prisma';
import crypto from 'crypto';

// Create a server-side cache for API keys that persists across hot reloads
// This avoids issues with process.env modifications being lost
let apiKeyCache: {
  openai?: string;
  anthropic?: string;
  google?: string;
  mistral?: string;
  lastUpdated?: Date;
} = {};

// Encryption functions
function encrypt(text: string, secretKey: string): string {
  if (!text) return '';
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey.padEnd(32).slice(0, 32)), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText: string, secretKey: string): string {
  if (!encryptedText) return '';
  
  try {
    const [ivHex, encryptedHex] = encryptedText.split(':');
    
    if (!ivHex || !encryptedHex) return '';
    
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey.padEnd(32).slice(0, 32)), iv);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
}

// Helper to generate a provider-specific key name
function getKeyName(provider: string): string {
  return `${provider.toUpperCase()} API Key`;
}

// Export function to get cached API keys - can be imported by other server components
export function getCachedApiKeys() {
  return {
    openai: apiKeyCache.openai || process.env.OPENAI_API_KEY || '',
    anthropic: apiKeyCache.anthropic || process.env.ANTHROPIC_API_KEY || '',
    google: apiKeyCache.google || process.env.GOOGLE_API_KEY || '',
    mistral: apiKeyCache.mistral || process.env.MISTRAL_API_KEY || ''
  };
}

// Get the API keys for the current user
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to access this feature.' },
        { status: 401 }
      );
    }
    
    // Return the cached keys if we have them
    if (apiKeyCache.lastUpdated) {
      return NextResponse.json({
        openai: apiKeyCache.openai || '',
        anthropic: apiKeyCache.anthropic || '',
        google: apiKeyCache.google || '',
        mistral: apiKeyCache.mistral || ''
      });
    }
    
    // Default empty response
    const response = {
      openai: '',
      anthropic: '',
      google: '',
      mistral: ''
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Save the API keys for the current user
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to access this feature.' },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await request.json();
    
    // Get all providers and their values
    const providers = ['openai', 'anthropic', 'google', 'mistral'];
    
    // Update the server-side cache (this is the part that will actually work)
    apiKeyCache = {
      openai: body.openai || '',
      anthropic: body.anthropic || '',
      google: body.google || '',
      mistral: body.mistral || '',
      lastUpdated: new Date()
    };
    
    console.log('API keys updated in server cache:', {
      openai: body.openai ? '✓' : '✗',
      anthropic: body.anthropic ? '✓' : '✗',
      google: body.google ? '✓' : '✗',
      mistral: body.mistral ? '✓' : '✗'
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}