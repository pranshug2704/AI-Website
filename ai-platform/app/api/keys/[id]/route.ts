import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Delete an API key
export async function DELETE(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
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
    
    // Get API key to verify ownership
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: params.id }
    });
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }
    
    // Verify that the API key belongs to the user
    if (apiKey.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Delete the API key
    await prisma.apiKey.delete({
      where: { id: params.id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API key deletion error:', error);
    return NextResponse.json(
      { error: 'An error occurred while deleting API key' },
      { status: 500 }
    );
  }
}