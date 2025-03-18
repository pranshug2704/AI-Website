'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ChatInterface from '../../components/chat/ChatInterface';
import { useAuth } from '../../lib/auth-context';
import { Chat } from '../../types';

export default function ChatPageWithId() {
  const router = useRouter();
  const params = useParams();
  const chatId = params?.chatId as string;
  const { user, loading } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch chats from the API
  useEffect(() => {
    let isMounted = true;
    
    async function fetchChats() {
      if (!user) return;
      
      try {
        setIsLoadingChats(true);
        const response = await fetch('/api/chat/history');
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to fetch chats');
        }
        
        const data = await response.json();
        
        // Only update state if component is still mounted
        if (isMounted) {
          // Process dates as they come as strings from the API
          const processedChats = (data.chats || []).map((chat: any) => ({
            ...chat,
            createdAt: new Date(chat.createdAt),
            updatedAt: new Date(chat.updatedAt),
            messages: (chat.messages || []).map((msg: any) => ({
              ...msg,
              createdAt: new Date(msg.createdAt)
            }))
          }));
          
          setChats(processedChats);
        }
      } catch (err) {
        console.error('Error fetching chats:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load chats');
        }
      } finally {
        if (isMounted) {
          setIsLoadingChats(false);
        }
      }
    }
    
    if (user) {
      fetchChats();
    }
    
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Load specific chat by ID from URL
  useEffect(() => {
    let isMounted = true;
    
    async function fetchSpecificChat() {
      if (!user || !chatId || chatId === 'new' || isLoadingChats) return;
      
      try {
        // First check if we already have this chat in our loaded chats
        const existingChat = chats.find(c => c.id === chatId);
        if (existingChat) {
          if (isMounted) {
            setSelectedChat(existingChat);
          }
          return;
        }
        
        // If not found in local state, fetch it from API
        const response = await fetch(`/api/chat/history?id=${chatId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            // Chat not found, redirect to new chat
            router.push('/chat/new');
            return;
          }
          const error = await response.json();
          throw new Error(error.error || 'Failed to fetch chat');
        }
        
        const data = await response.json();
        
        if (data.chat && isMounted) {
          // Process dates
          const processedChat = {
            ...data.chat,
            createdAt: new Date(data.chat.createdAt),
            updatedAt: new Date(data.chat.updatedAt),
            messages: (data.chat.messages || []).map((msg: any) => ({
              ...msg,
              createdAt: new Date(msg.createdAt)
            }))
          };
          
          setSelectedChat(processedChat);
          // Also add this chat to our list of chats
          setChats(prev => {
            // Replace if already exists, otherwise add
            const exists = prev.some(c => c.id === processedChat.id);
            return exists 
              ? prev.map(c => c.id === processedChat.id ? processedChat : c)
              : [processedChat, ...prev];
          });
        } else if (isMounted) {
          // No chat found, redirect to new chat
          router.push('/chat/new');
        }
      } catch (err) {
        console.error('Error fetching specific chat:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load chat');
        }
      }
    }
    
    fetchSpecificChat();
    
    return () => {
      isMounted = false;
    };
  }, [user, chatId, chats, isLoadingChats, router]);

  // Create a new chat if 'new' is specified in the URL
  useEffect(() => {
    if (user && chatId === 'new' && !isLoadingChats) {
      // We'll handle new chat creation in the ChatInterface component
      setSelectedChat(null);
    }
  }, [user, chatId, isLoadingChats]);

  if (loading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-600 dark:text-primary-300 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Loading Chat Interface
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please wait while we connect to your account...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600 dark:text-red-300" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Chat
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <div className="flex justify-center space-x-3">
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Try Again
            </button>
            <button 
              onClick={() => router.push('/chat/new')}
              className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Start New Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ChatInterface 
      initialChats={chats} 
      currentUser={user}
      initialChatId={chatId}
      selectedChat={selectedChat}
    />
  );
} 