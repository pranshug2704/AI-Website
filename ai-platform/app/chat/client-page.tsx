'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ChatInterface from '../components/chat/ChatInterface';
import { useAuth } from '../lib/auth-context';
import { Chat } from '../types';

// Add a reconnection mechanism for handling hot reloads
function useReconnectionHandler() {
  const [reconnecting, setReconnecting] = useState(false);
  
  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout | null = null;
    
    // When the page first loads, mark it as connected
    const markConnected = () => {
      localStorage.setItem('lastConnected', Date.now().toString());
    };
    
    // Check if we've lost connection and just got it back
    const checkReconnection = () => {
      const lastConnected = localStorage.getItem('lastConnected');
      const now = Date.now();
      
      // If we haven't recorded the last connection or it was more than 3 seconds ago
      if (!lastConnected || (now - parseInt(lastConnected)) > 3000) {
        console.log('Reconnected after possible disconnect, refreshing state...');
        setReconnecting(true);
        
        // Update the timestamp and reload once
        localStorage.setItem('lastConnected', now.toString());
        
        // Wait a moment before triggering a refresh
        reconnectTimer = setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    };
    
    // Mark as connected when mounting
    markConnected();
    
    // Check if we need to reconnect (e.g., after a hot reload)
    checkReconnection();
    
    // Set up an interval to update the connected timestamp
    const interval = setInterval(markConnected, 1000);
    
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(interval);
    };
  }, []);
  
  return reconnecting;
}

export default function ClientChatPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const params = useParams();
  const chatId = params?.chatId as string;
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reconnecting = useReconnectionHandler();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load all chats on first render
  useEffect(() => {
    let isMounted = true;
    
    async function fetchAllChats() {
      if (!user) return;
      
      try {
        console.log("Fetching all chat history...");
        setIsLoadingChats(true);
        const response = await fetch('/api/chat/history');
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to fetch chats');
        }
        
        const data = await response.json();
        
        // Only update state if component is still mounted
        if (isMounted) {
          console.log(`Fetched ${data.chats?.length || 0} chats from server`);
          
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
          
          // If we have chats and no active chat, set the first one as active
          if (processedChats.length > 0 && !selectedChat) {
            // If specific chatId is provided and found in results, use it
            if (chatId && chatId !== 'new') {
              const requestedChat = processedChats.find((c: any) => c.id === chatId);
              if (requestedChat) {
                setSelectedChat(requestedChat);
              } else {
                // If specified chat not found, use the first one
                setSelectedChat(processedChats[0]);
              }
            } else if (chatId !== 'new') {
              // If no specific chat requested, use the first one
              setSelectedChat(processedChats[0]);
            }
          }
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
      fetchAllChats();
    }
    
    return () => {
      isMounted = false;
    };
  }, [user, chatId, selectedChat]);

  if (reconnecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Reconnecting...</h2>
          <p className="text-gray-600 dark:text-gray-300">Please wait while we restore your session</p>
        </div>
      </div>
    );
  }

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
            Error Loading Chats
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <ChatInterface initialChats={chats} currentUser={user} />
  );
}