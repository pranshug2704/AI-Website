import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCurrentUser } from '@/app/lib/server-auth';

export async function GET(req: NextRequest) {
  try {
    // Get the session directly for debugging
    const session = await getServerSession(authOptions);
    
    // Also try to get the user
    const user = await getCurrentUser();
    
    console.log('[Session API] Session check:', {
      hasSession: !!session,
      sessionUserId: session?.user?.id,
      hasUser: !!user,
      userId: user?.id,
    });
    
    if (!session || !user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
    // Return minimal session info
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      }
    });
  } catch (error) {
    console.error('[Session API] Error getting session:', error);
    return NextResponse.json(
      { error: 'Error fetching session' },
      { status: 500 }
    );
  }
} 