import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get current session
    const session = await getServerSession(authOptions);
    
    // Check if database is reachable
    let dbStatus = 'unknown';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'error';
    }
    
    // Get user count (if db is connected)
    let userCount = 0;
    if (dbStatus === 'connected') {
      userCount = await prisma.user.count();
    }
    
    // Return debug info (don't expose sensitive data)
    return NextResponse.json({
      authenticated: !!session,
      sessionStatus: {
        exists: !!session,
        hasUser: !!session?.user,
        userEmail: session?.user?.email ? true : false,
        userId: session?.user?.id ? true : false,
      },
      databaseStatus: dbStatus,
      userCount,
      nextAuthConfig: {
        providersConfigured: !!authOptions.providers?.length,
        callbacksConfigured: {
          jwt: !!authOptions.callbacks?.jwt,
          session: !!authOptions.callbacks?.session,
          signIn: !!authOptions.callbacks?.signIn,
        },
        pagesConfigured: !!authOptions.pages,
        sessionStrategy: authOptions.session?.strategy || 'default',
      },
      env: {
        nodeEnv: process.env.NODE_ENV,
        nextAuthUrl: !!process.env.NEXTAUTH_URL,
        databaseUrlConfigured: !!process.env.DATABASE_URL,
      }
    });
  } catch (error) {
    console.error('Auth debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Error retrieving auth debug info' },
      { status: 500 }
    );
  }
} 