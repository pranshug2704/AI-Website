import { NextRequest, NextResponse } from 'next/server';
import { getAvailableProviders } from '@/app/lib/server-utils';

export async function GET(request: NextRequest) {
  try {
    // Get available providers from server utils
    const availableProviders = getAvailableProviders();
    
    return NextResponse.json({
      providers: availableProviders,
      count: availableProviders.length
    });
  } catch (error) {
    console.error('Error checking available providers:', error);
    return NextResponse.json(
      { error: 'Failed to check available providers' },
      { status: 500 }
    );
  }
} 