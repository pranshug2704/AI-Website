import { NextResponse } from 'next/server';
import { isOllamaAvailable, getAvailableOllamaModels } from '@/app/lib/ai-api';

export async function GET() {
  try {
    // Check if Ollama is available
    const available = await isOllamaAvailable();
    
    if (!available) {
      return NextResponse.json({
        available: false,
        error: 'Ollama server is not running'
      });
    }
    
    // Get available models
    const models = await getAvailableOllamaModels();
    
    return NextResponse.json({
      available: true,
      models
    });
  } catch (error) {
    console.error('Error checking Ollama status:', error);
    
    return NextResponse.json({
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error checking Ollama'
    }, { status: 500 });
  }
} 