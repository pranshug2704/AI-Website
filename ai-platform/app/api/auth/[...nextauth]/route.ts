import NextAuth, { AuthOptions, Session, DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcrypt';
import prisma from '@/app/lib/prisma';

// Extend the built-in session and user types
declare module 'next-auth' {
  interface User {
    id: string;
    subscription: string;
    usageTotal: number;
    usageLimit: number;
  }

  interface Session {
    user: {
      id: string;
      subscription: string;
      usageTotal: number;
      usageLimit: number;
    } & DefaultSession['user']
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.error('Missing credentials');
            return null;
          }
          
          // Test database connection
          try {
            await prisma.$queryRaw`SELECT 1`;
          } catch (dbError) {
            console.error('Database connection error:', dbError);
            throw new Error('Database connection failed');
          }
          
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });
          
          if (!user) {
            console.error('User not found:', credentials.email);
            return null;
          }
          
          const isPasswordValid = await compare(credentials.password, user.password);
          
          if (!isPasswordValid) {
            console.error('Invalid password for user:', credentials.email);
            return null;
          }
          
          // Update last login time
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
          });
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            subscription: user.subscription,
            usageTotal: user.usageTotal,
            usageLimit: user.usageLimit
          };
        } catch (error) {
          console.error('Authorization error:', error);
          throw new Error(error instanceof Error ? error.message : 'Unknown error during authentication');
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.subscription = user.subscription;
        token.usageTotal = user.usageTotal;
        token.usageLimit = user.usageLimit;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.subscription = token.subscription as string;
        session.user.usageTotal = token.usageTotal as number;
        session.user.usageLimit = token.usageLimit as number;
      }
      return session;
    },
    async signIn({ user }) {
      // Allow sign in if we have a valid user
      return !!user;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60 // 24 hours
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };