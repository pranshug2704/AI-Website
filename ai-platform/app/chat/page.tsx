'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import RootLayout from '../components/RootLayout';

export default function ChatRedirectPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    async function redirectToChat() {
      if (!user) {
        if (!loading) {
          router.push('/login');
        }
        return;
      }

      try {
        // Fetch user's chats
        const response = await fetch('/api/chat/history');
        
        if (!response.ok) {
          throw new Error('Failed to fetch chats');
        }
        
        const data = await response.json();
        
        if (data.chats && data.chats.length > 0) {
          // Redirect to the most recent chat
          router.push(`/chat/${data.chats[0].id}`);
        } else {
          // No chats exist, redirect to new chat page
          router.push('/chat/new');
        }
      } catch (error) {
        console.error('Error fetching chats for redirect:', error);
        // On error, redirect to new chat
        router.push('/chat/new');
      }
    }

    redirectToChat();
  }, [user, loading, router]);

  return (
    <RootLayout>
      <div className="flex-1 flex items-center justify-center h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Loading Your Chats</h2>
          <p className="text-gray-600 dark:text-gray-300">Please wait while we connect to your account...</p>
        </div>
      </div>
    </RootLayout>
  );
}