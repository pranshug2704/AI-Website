# Guide to Replacing Demo Components with Real API Integrations

This guide provides step-by-step instructions for replacing all demo functionality in the AI Platform with real API integrations.

## 1. Authentication System

### 1.1 Replace the Mock Auth System

The current authentication is simulated in `lib/auth.ts`. Replace it with a real authentication provider:

#### Option 1: Next-Auth (Recommended)

1. Install Next-Auth:
   ```bash
   npm install next-auth
   ```

2. Create an API route for authentication at `app/api/auth/[...nextauth]/route.ts`:
   ```typescript
   import NextAuth from 'next-auth';
   import CredentialsProvider from 'next-auth/providers/credentials';
   import { PrismaAdapter } from '@auth/prisma-adapter';
   import { PrismaClient } from '@prisma/client';
   import { compare } from 'bcrypt';

   const prisma = new PrismaClient();

   export const authOptions = {
     adapter: PrismaAdapter(prisma),
     providers: [
       CredentialsProvider({
         name: 'credentials',
         credentials: {
           email: { label: 'Email', type: 'email' },
           password: { label: 'Password', type: 'password' }
         },
         async authorize(credentials) {
           if (!credentials?.email || !credentials?.password) {
             return null;
           }
           
           const user = await prisma.user.findUnique({
             where: { email: credentials.email }
           });
           
           if (!user) {
             return null;
           }
           
           const isPasswordValid = await compare(credentials.password, user.password);
           
           if (!isPasswordValid) {
             return null;
           }
           
           return {
             id: user.id,
             email: user.email,
             name: user.name,
             subscription: user.subscription
           };
         }
       })
     ],
     callbacks: {
       async session({ session, user }) {
         return {
           ...session,
           user: {
             ...session.user,
             id: user.id,
             subscription: user.subscription
           }
         };
       }
     },
     pages: {
       signIn: '/login',
       error: '/login'
     },
     session: {
       strategy: 'jwt'
     }
   };

   const handler = NextAuth(authOptions);
   export { handler as GET, handler as POST };
   ```

3. Update the `auth-context.tsx` to use NextAuth instead of the mock auth system.

#### Option 2: Firebase Authentication

1. Install Firebase:
   ```bash
   npm install firebase
   ```

2. Initialize Firebase in a new file `lib/firebase.ts`:
   ```typescript
   import { initializeApp, getApps } from 'firebase/app';
   import { getAuth } from 'firebase/auth';
   import { getFirestore } from 'firebase/firestore';

   const firebaseConfig = {
     apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
     authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
     projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
     storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
     messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
     appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
   };

   // Initialize Firebase
   const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
   const auth = getAuth(app);
   const db = getFirestore(app);

   export { app, auth, db };
   ```

3. Create authentication functions in `lib/auth.ts`:
   ```typescript
   import { 
     createUserWithEmailAndPassword, 
     signInWithEmailAndPassword,
     signOut,
     onAuthStateChanged
   } from 'firebase/auth';
   import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
   import { auth, db } from './firebase';
   import { User } from '../types';

   export const registerUser = async (name: string, email: string, password: string, subscription: 'free' | 'pro' | 'enterprise' = 'free'): Promise<User> => {
     const userCredential = await createUserWithEmailAndPassword(auth, email, password);
     
     // Create user document in Firestore
     await setDoc(doc(db, 'users', userCredential.user.uid), {
       id: userCredential.user.uid,
       name,
       email,
       subscription,
       usage: {
         totalTokens: 0,
         limit: subscription === 'free' ? 100000 : subscription === 'pro' ? 1000000 : 10000000
       },
       createdAt: serverTimestamp()
     });
     
     return {
       id: userCredential.user.uid,
       name,
       email,
       subscription,
       usage: {
         totalTokens: 0,
         limit: subscription === 'free' ? 100000 : subscription === 'pro' ? 1000000 : 10000000
       }
     };
   };

   export const loginUser = async (email: string, password: string): Promise<User | null> => {
     const userCredential = await signInWithEmailAndPassword(auth, email, password);
     
     // Get user document from Firestore
     const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
     
     if (userDoc.exists()) {
       const userData = userDoc.data();
       
       // Update last login timestamp
       await updateDoc(doc(db, 'users', userCredential.user.uid), {
         lastLogin: serverTimestamp()
       });
       
       return {
         id: userDoc.id,
         name: userData.name,
         email: userData.email,
         subscription: userData.subscription,
         usage: userData.usage
       };
     }
     
     return null;
   };

   export const logoutUser = async (): Promise<void> => {
     await signOut(auth);
   };

   export const getCurrentUser = async (): Promise<User | null> => {
     return new Promise((resolve) => {
       const unsubscribe = onAuthStateChanged(auth, async (user) => {
         unsubscribe();
         
         if (user) {
           const userDoc = await getDoc(doc(db, 'users', user.uid));
           
           if (userDoc.exists()) {
             const userData = userDoc.data();
             
             resolve({
               id: userDoc.id,
               name: userData.name,
               email: userData.email,
               subscription: userData.subscription,
               usage: userData.usage
             });
           } else {
             resolve(null);
           }
         } else {
           resolve(null);
         }
       });
     });
   };
   ```

### 1.2 Update Your Database Schema

Create a Prisma schema for a SQL database or Firestore collections for a NoSQL approach:

#### SQL with Prisma (if using NextAuth)

1. Install Prisma:
   ```bash
   npm install prisma @prisma/client
   npx prisma init
   ```

2. Update the `prisma/schema.prisma` file:
   ```prisma
   datasource db {
     provider = "postgresql" // or "mysql" or "sqlite"
     url      = env("DATABASE_URL")
   }

   generator client {
     provider = "prisma-client-js"
   }

   model User {
     id            String    @id @default(cuid())
     name          String
     email         String    @unique
     password      String
     subscription  String    @default("free") // "free", "pro", "enterprise"
     usageLimit    Int       @default(100000)
     usageTotal    Int       @default(0)
     createdAt     DateTime  @default(now())
     updatedAt     DateTime  @updatedAt
     lastLogin     DateTime?
     chats         Chat[]
   }

   model Chat {
     id          String      @id @default(cuid())
     title       String
     modelId     String?
     userId      String
     user        User        @relation(fields: [userId], references: [id])
     messages    Message[]
     createdAt   DateTime    @default(now())
     updatedAt   DateTime    @updatedAt
   }

   model Message {
     id          String    @id @default(cuid())
     role        String    // "user", "assistant", "system", "error"
     content     String    @db.Text
     chatId      String
     chat        Chat      @relation(fields: [chatId], references: [id])
     modelId     String?
     promptTokens Int?
     completionTokens Int?
     totalTokens Int?
     createdAt   DateTime  @default(now())
   }
   ```

## 2. Replacing Demo AI APIs with Real Providers

### 2.1 Create API Keys for Each Provider

Obtain API keys for the providers you want to integrate with:

1. **OpenAI API**: Sign up at https://platform.openai.com
2. **Anthropic API**: Sign up at https://console.anthropic.com
3. **Google API**: Sign up for Gemini at https://ai.google.dev/
4. **Mistral API**: Sign up at https://console.mistral.ai/

### 2.2 Set Up Environment Variables

Create a `.env.local` file in your project root:

```
# Authentication (choose one)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Database
DATABASE_URL=your-database-url

# AI Providers
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_API_KEY=your-google-key
MISTRAL_API_KEY=your-mistral-key

# Stripe (for payments)
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

### 2.3 Update the AI API Implementation

Replace the dummy implementation in `lib/ai-api.ts` with real API calls:

```typescript
import { Message, AIResponse, TokenUsage } from '../types';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MistralClient } from '@mistralai/mistralai-js';

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const googleAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

const mistral = new MistralClient(process.env.MISTRAL_API_KEY || '');

// Stream response from OpenAI
export async function* streamOpenAI(messages: Message[], modelId: string) {
  const mappedMessages = messages.map(m => ({
    role: m.role === 'user' ? 'user' : m.role === 'assistant' ? 'assistant' : 'system',
    content: m.content
  }));

  try {
    const stream = await openai.chat.completions.create({
      model: modelId,
      messages: mappedMessages,
      stream: true,
    });

    let content = '';
    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;

    for await (const chunk of stream) {
      const partialContent = chunk.choices[0]?.delta?.content || '';
      content += partialContent;
      yield partialContent;
      
      // OpenAI doesn't provide token counts in stream, estimate based on content
      completionTokens += partialContent.length / 4;
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
export async function* streamAnthropic(messages: Message[], modelId: string) {
  try {
    const prompt = convertMessagesToAnthropicPrompt(messages);
    
    const stream = await anthropic.messages.create({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
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
    promptTokens = prompt.length / 4;
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

// Helper function to convert messages to Anthropic prompt format
function convertMessagesToAnthropicPrompt(messages: Message[]): string {
  let prompt = '';
  
  for (const message of messages) {
    if (message.role === 'system') {
      prompt += `<system>${message.content}</system>\n\n`;
    } else if (message.role === 'user') {
      prompt += `Human: ${message.content}\n\n`;
    } else if (message.role === 'assistant') {
      prompt += `Assistant: ${message.content}\n\n`;
    }
  }
  
  // Add final "Human:" for the assistant to respond to
  if (messages[messages.length - 1].role !== 'assistant') {
    prompt += 'Assistant: ';
  }
  
  return prompt;
}

// Implement remaining streaming functions for Google and Mistral similarly
// ...

// Main function to route to the correct API provider
export async function* streamAIResponse(
  messages: Message[],
  modelId: string,
) {
  if (modelId.startsWith('gpt-')) {
    return yield* streamOpenAI(messages, modelId);
  } else if (modelId.startsWith('claude-')) {
    return yield* streamAnthropic(messages, modelId);
  } else if (modelId.startsWith('gemini-')) {
    return yield* streamGoogle(messages, modelId);
  } else if (modelId.startsWith('mistral-')) {
    return yield* streamMistral(messages, modelId);
  } else {
    throw new Error(`Unknown model ID: ${modelId}`);
  }
}
```

## 3. Setting Up Real Chat History Storage

### 3.1 Update the Chat Library

Replace the mock implementation in `lib/chat.ts`:

```typescript
import { Chat, Message } from '../types';
import { PrismaClient } from '@prisma/client';
// For Firebase, use:
// import { db } from './firebase';
// import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const prisma = new PrismaClient();

// Get chat by ID
export async function getChat(chatId: string): Promise<Chat | null> {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { messages: true }
  });

  if (!chat) return null;

  return {
    id: chat.id,
    title: chat.title,
    messages: chat.messages.map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system' | 'error',
      content: m.content,
      createdAt: m.createdAt,
      modelId: m.modelId || undefined,
      usage: m.totalTokens ? {
        promptTokens: m.promptTokens || 0,
        completionTokens: m.completionTokens || 0,
        totalTokens: m.totalTokens
      } : undefined,
    })),
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    modelId: chat.modelId || undefined
  };
}

// Get all chats for a user
export async function getUserChats(userId: string): Promise<Chat[]> {
  const chats = await prisma.chat.findMany({
    where: { userId },
    include: { messages: true },
    orderBy: { updatedAt: 'desc' }
  });

  return chats.map(chat => ({
    id: chat.id,
    title: chat.title,
    messages: chat.messages.map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system' | 'error',
      content: m.content,
      createdAt: m.createdAt,
      modelId: m.modelId || undefined,
      usage: m.totalTokens ? {
        promptTokens: m.promptTokens || 0,
        completionTokens: m.completionTokens || 0,
        totalTokens: m.totalTokens
      } : undefined,
    })),
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    modelId: chat.modelId || undefined
  }));
}

// Create a new chat
export async function createChat(userId: string, title: string, modelId?: string): Promise<Chat> {
  const chat = await prisma.chat.create({
    data: {
      title,
      modelId,
      userId
    },
    include: { messages: true }
  });

  return {
    id: chat.id,
    title: chat.title,
    messages: [],
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    modelId: chat.modelId || undefined
  };
}

// Implement remaining functions for adding messages, deleting chats, etc.
// ...
```

## 4. Implementing Payment Processing with Stripe

### 4.1 Install Stripe

```bash
npm install stripe @stripe/stripe-js
```

### 4.2 Create Subscription Management API

Create a file at `app/api/stripe/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const prisma = new PrismaClient();

// Create checkout session for subscription
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { priceId } = body;
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Create or retrieve customer
    let customerId = user.stripeCustomerId;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user.id
        }
      });
      
      customerId = customer.id;
      
      // Update user with Stripe customer ID
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId }
      });
    }
    
    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXTAUTH_URL}/settings?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/settings?canceled=true`,
      subscription_data: {
        metadata: {
          userId: user.id
        }
      }
    });
    
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Stripe API error:', error);
    return NextResponse.json(
      { error: 'An error occurred with the payment service' },
      { status: 500 }
    );
  }
}
```

### 4.3 Create Webhook Endpoint

Create a file at `app/api/webhooks/stripe/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature')!;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  switch (event.type) {
    case 'checkout.session.completed':
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      
      // Handle successful checkout
      if (checkoutSession.subscription && checkoutSession.customer) {
        const subscription = await stripe.subscriptions.retrieve(
          checkoutSession.subscription as string
        );
        
        const userId = subscription.metadata.userId;
        const priceId = subscription.items.data[0].price.id;
        
        // Determine subscription tier based on price ID
        let subscriptionTier = 'free';
        let usageLimit = 100000;
        
        if (priceId === 'price_pro_monthly') {
          subscriptionTier = 'pro';
          usageLimit = 1000000;
        } else if (priceId === 'price_enterprise_monthly') {
          subscriptionTier = 'enterprise';
          usageLimit = 10000000;
        }
        
        // Update user subscription
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscription: subscriptionTier,
            usageLimit,
            stripeSubscriptionId: subscription.id
          }
        });
      }
      break;
      
    case 'customer.subscription.updated':
      // Handle subscription updates
      const updatedSubscription = event.data.object as Stripe.Subscription;
      // ...handle subscription updates
      break;
      
    case 'customer.subscription.deleted':
      // Handle subscription cancellations
      const deletedSubscription = event.data.object as Stripe.Subscription;
      
      const userId = deletedSubscription.metadata.userId;
      
      // Reset user to free tier
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscription: 'free',
          usageLimit: 100000,
          stripeSubscriptionId: null
        }
      });
      break;
  }
  
  return NextResponse.json({ received: true });
}
```

## 5. Creating Frontend Components for Real Integration

### 5.1 Update User Profile Component

Update the profile page to display real subscription information and payment history:

```tsx
// In app/profile/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RootLayout from '../components/RootLayout';
import { useAuth } from '../lib/auth-context';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [paymentHistory, setPaymentHistory] = useState([]);
  
  // Fetch payment history
  useEffect(() => {
    if (user) {
      fetch('/api/user/payments')
        .then(res => res.json())
        .then(data => {
          setPaymentHistory(data.payments);
        })
        .catch(err => {
          console.error('Failed to fetch payment history:', err);
        });
    }
  }, [user]);

  // Rest of the component remains the same...
}
```

### 5.2 Create Subscription Management Page

Create a new page at `app/settings/subscription/page.tsx` for managing subscriptions:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RootLayout from '../../components/RootLayout';
import { useAuth } from '../../lib/auth-context';

export default function SubscriptionPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubscribe = async (priceId: string) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      });
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      // Show error message to user
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleManageSubscription = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Failed to create customer portal session');
      }
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      // Show error message to user
    } finally {
      setIsLoading(false);
    }
  };
  
  // Rest of the component to display plans, current subscription, etc.
}
```

## 6. Real API Key Management for Developer API Access

### 6.1 Create API Key Management Backend

Create an API endpoint at `app/api/keys/route.ts`:

```typescript
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
    
    // Generate a new API key
    const apiKey = `sk-${crypto.randomBytes(24).toString('hex')}`;
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    // Save the hashed key to the database
    await prisma.apiKey.create({
      data: {
        key: hashedKey,
        name: `API Key ${new Date().toLocaleDateString()}`,
        userId: user.id
      }
    });
    
    return NextResponse.json({ apiKey });
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
```

### 6.2 Create Developer API Endpoint

Create an API endpoint that developers can use at `app/api/v1/chat/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { streamAIResponse } from '@/app/lib/ai-api';
import { routeAIRequest } from '@/app/lib/ai-router';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'API key is required in Authorization header' },
        { status: 401 }
      );
    }
    
    const apiKey = authHeader.substring(7);
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    // Find API key in database
    const keyRecord = await prisma.apiKey.findFirst({
      where: { key: hashedKey },
      include: { user: true }
    });
    
    if (!keyRecord) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsed: new Date() }
    });
    
    // Get request body
    const body = await request.json();
    const { messages, modelId } = body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }
    
    // Check if user has enough tokens
    const user = keyRecord.user;
    
    if (user.usageTotal >= user.usageLimit) {
      return NextResponse.json(
        { error: 'Token usage limit exceeded. Please upgrade your plan.' },
        { status: 403 }
      );
    }
    
    // Get the latest user message
    const latestUserMessage = [...messages].reverse().find(m => m.role === 'user');
    
    if (!latestUserMessage) {
      return NextResponse.json(
        { error: 'No user message found in the messages array' },
        { status: 400 }
      );
    }
    
    // Route the request to the appropriate model
    const { selectedModel, taskType } = routeAIRequest({
      prompt: latestUserMessage.content,
      userTier: user.subscription,
      preferredModelId: modelId
    });
    
    // Stream the response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();
    
    // Start streaming response in the background
    (async () => {
      try {
        // Send initial metadata
        const metadata = {
          model: selectedModel.id,
          task_type: taskType,
          user: {
            tier: user.subscription,
            usage: {
              total: user.usageTotal,
              limit: user.usageLimit,
              remaining: user.usageLimit - user.usageTotal
            }
          }
        };
        
        await writer.write(encoder.encode(JSON.stringify(metadata) + '\n'));
        
        // Stream the AI response
        let totalTokens = 0;
        
        for await (const chunk of streamAIResponse(messages, selectedModel.id)) {
          await writer.write(encoder.encode(chunk));
        }
        
        // Get final usage information
        const usageInfo = await streamAIResponse(messages, selectedModel.id).next();
        
        if (usageInfo.done && usageInfo.value) {
          totalTokens = usageInfo.value.usage.totalTokens;
          
          // Update user token usage
          await prisma.user.update({
            where: { id: user.id },
            data: { usageTotal: user.usageTotal + totalTokens }
          });
          
          // Send usage information
          const usage = {
            prompt_tokens: usageInfo.value.usage.promptTokens,
            completion_tokens: usageInfo.value.usage.completionTokens,
            total_tokens: totalTokens
          };
          
          await writer.write(encoder.encode('\n' + JSON.stringify({ usage }) + '\n'));
        }
      } catch (error) {
        console.error('Streaming error:', error);
        
        await writer.write(encoder.encode(
          JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }) + '\n'
        ));
      } finally {
        await writer.close();
      }
    })();
    
    return new NextResponse(stream.readable, {
      headers: {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked'
      }
    });
  } catch (error) {
    console.error('API error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
```

## 7. Deploying Your Application

### 7.1 Set Up CI/CD Pipeline

Create a GitHub Actions workflow at `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Lint
      run: npm run lint
    
    - name: Type check
      run: npm run typecheck
    
    - name: Build
      run: npm run build
    
    - name: Test
      run: npm run test
      
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        vercel-args: '--prod'
```

### 7.2 Set Up Environment Variables in Production

Add all your environment variables to your hosting provider (Vercel, AWS, etc.):

1. All API keys
2. Database connection string
3. Authentication secrets
4. Stripe keys
5. Other configuration variables

## 8. Final Checklist

Before launching your product:

1. ✅ Replace all mock authentication with real user authentication
2. ✅ Implement real database storage for users, chats, and messages
3. ✅ Set up real API connections to OpenAI, Anthropic, etc.
4. ✅ Implement payment processing with Stripe
5. ✅ Create developer API with API key management
6. ✅ Set up proper error handling and logging
7. ✅ Implement rate limiting for API endpoints
8. ✅ Set up analytics to track usage
9. ✅ Create comprehensive documentation for developers
10. ✅ Set up monitoring and alerts for system performance
11. ✅ Implement proper security measures (HTTPS, CORS, etc.)
12. ✅ Ensure GDPR/privacy compliance

This guide covers the essential components needed to transform your demo AI Platform into a fully functional production system with real API integrations, payment processing, and more.