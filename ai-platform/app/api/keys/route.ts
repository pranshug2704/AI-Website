import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Generate a new API key
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get request body
    const body = await request.json();
    const { name = `API Key ${new Date().toLocaleDateString()}` } = body;
    
    // Generate a new API key
    const apiKey = `sk-${crypto.randomBytes(24).toString('hex')}`;
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    // Save the hashed key to the database
    await prisma.apiKey.create({
      data: {
        key: hashedKey,
        name,
        userId: user.id
      }
    });
    
    return NextResponse.json({ apiKey, name });
  } catch (error) {
    console.error('API key generation error:', error);
    return NextResponse.json(
      { error: 'An error occurred while generating API key' },
      { status: 500 }
    );
  }
}

// Get all API keys for a user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get all API keys for the user (without the actual keys)
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsed: true
      }
    });
    
    return NextResponse.json({ apiKeys });
  } catch (error) {
    console.error('API key retrieval error:', error);
    return NextResponse.json(
      { error: 'An error occurred while retrieving API keys' },
      { status: 500 }
    );
  }
}