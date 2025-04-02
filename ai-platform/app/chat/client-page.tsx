'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { useChat } from '../lib/hooks/useChat';
import ChatInterface from '../components/chat/ChatInterface';
import { Chat, User, AIModel, ImageContent } from '../types';
import RootLayout from '../components/RootLayout';
import { getAvailableOllamaModels } from '../lib/ai-api';

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
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = searchParams.get('id');
  const [initialChats, setInitialChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel | undefined>();
  const reconnecting = useReconnectionHandler();
  
  const {
    chats,
    activeChat,
    handleNewChat,
    handleSelectChat,
    handleDeleteChat,
    sendMessage,
    handleModelChange,
    setChats,
    setActiveChat,
  } = useChat(initialChats, user || null, chatId || undefined, selectedChat);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      console.log('[ClientChatPage] No user found, redirecting to login');
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch available models
  useEffect(() => {
    async function fetchAvailableModels() {
      try {
        const response = await fetch('/api/models/available');
        if (response.ok) {
          const modelNames = await response.json();
          const models: AIModel[] = modelNames.map((name: string) => ({
            id: name,
            name,
            provider: name.split('-')[0],
            capabilities: ['text'],
            tier: 'free',
            maxTokens: 1000,
            description: `AI model for text generation`
          }));
          setAvailableModels(models);
          if (models.length > 0) {
            setSelectedModel(models[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching available models:', error);
      }
    }

    if (user) {
      fetchAvailableModels();
    }
  }, [user]);

  // Fetch initial chats
  useEffect(() => {
    if (!user) return;

    const fetchInitialChats = async () => {
      try {
        console.log('[client-page] Starting to fetch chats for user:', user.id);
        const response = await fetch('/api/chat/history');
        if (!response.ok) {
          throw new Error('Failed to fetch chats');
        }
        const data = await response.json();
        console.log('[client-page] Fetched chats:', {
          count: data.chats?.length || 0,
          firstChat: data.chats?.[0] ? { id: data.chats[0].id, title: data.chats[0].title } : null
        });
        
        if (data.chats?.length > 0) {
          // Set initialChats state
          setInitialChats(data.chats);
          
          // If we have a chatId in the URL, select that chat
          if (chatId) {
            const selectedChat = data.chats.find((c: Chat) => c.id === chatId);
            if (selectedChat) {
              console.log('[client-page] Found chat with ID, selecting:', chatId);
              setSelectedChat(selectedChat);
            }
          } else {
            // Otherwise, select the first chat with messages
            const firstChatWithMessages = data.chats.find((c: Chat) => c.messages && c.messages.length > 0);
            if (firstChatWithMessages) {
              console.log('[client-page] Selecting first chat with messages:', firstChatWithMessages.id);
              setSelectedChat(firstChatWithMessages);
            } else {
              console.log('[client-page] No chats with messages, selecting first chat');
              setSelectedChat(data.chats[0]);
            }
          }
          
          console.log('[client-page] Set chats state:', {
            initialChatsCount: data.chats.length,
            selectedChatId: chatId,
            selectedChatTitle: selectedChat?.title
          });
        } else {
          console.log('[client-page] No chats found in response');
          setInitialChats([]);
          setSelectedChat(null);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('[client-page] Error fetching chats:', error);
        setInitialChats([]);
        setSelectedChat(null);
        setIsLoading(false);
      }
    };

    fetchInitialChats();
  }, [user, chatId]);

  // Add debug logging for chat state changes
  useEffect(() => {
    console.log('[client-page] Chat state updated:', {
      initialChatsCount: initialChats?.length || 0,
      chatsCount: chats?.length || 0,
      activeChatId: activeChat?.id,
      selectedChatId: selectedChat?.id,
      isLoading
    });
  }, [initialChats, chats, activeChat, selectedChat, isLoading]);

  // Handle chat selection
  const handleSelectChatWrapper = useCallback(async (chatId: string) => {
    console.log('[client-page] Selecting chat:', chatId);
    try {
      const response = await fetch(`/api/chats/${chatId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chat');
      }
      const chat = await response.json();
      setActiveChat(chat);
      setChats(prevChats => {
        const updatedChats = prevChats?.map(c => 
          c.id === chat.id ? chat : c
        ) || [];
        return updatedChats;
      });
      // Update URL without page reload
      router.push(`/chat?id=${chatId}`);
    } catch (error) {
      console.error('[client-page] Error selecting chat:', error);
    }
  }, [setActiveChat, setChats, router]);

  // Handle new chat creation
  const handleNewChatWrapper = useCallback(async () => {
    try {
      const newChat = await handleNewChat();
      if (newChat) {
        router.push(`/chat?id=${newChat.id}`);
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  }, [handleNewChat, router]);

  // Handle chat deletion
  const handleDeleteChatWrapper = useCallback(async (chatId: string) => {
    try {
      await handleDeleteChat(chatId);
      if (activeChat?.id === chatId) {
        router.push('/chat');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  }, [handleDeleteChat, activeChat, router]);

  // Handle model change
  const handleModelChangeWrapper = useCallback((modelId: string) => {
    handleModelChange(modelId);
  }, [handleModelChange]);

  // Handle sending message
  const handleSendMessageWrapper = useCallback(async (content: string, images?: ImageContent[]) => {
    try {
      await sendMessage(content, images);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [sendMessage]);

  if (reconnecting) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Reconnecting...</p>
        </div>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <RootLayout>
      {/* Verify chats are being passed correctly */}
      {(() => {
        console.log("[ClientChatPage] Rendering with chat count:", chats.length);
        if (chats.length > 0) {
          console.log("[ClientChatPage] First chat being passed:", 
            {id: chats[0].id, title: chats[0].title, messages: chats[0].messages.length});
        }
        return null;
      })()}
      {isLoading ? (
        <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-600 dark:text-primary-300 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Loading Chats
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we load your chat history...
            </p>
          </div>
        </div>
      ) : (
        <ChatInterface
          initialChats={initialChats}
          currentUser={user}
          initialChatId={chatId as string}
          selectedChat={selectedChat}
          onSelectChat={handleSelectChatWrapper}
          onNewChat={handleNewChatWrapper}
          onDeleteChat={handleDeleteChatWrapper}
          chats={chats}
          activeChat={activeChat}
          isLoading={isLoading}
          selectedModel={selectedModel}
          availableModels={availableModels}
          handleModelChange={handleModelChangeWrapper}
          sendMessage={handleSendMessageWrapper}
        />
      )}
    </RootLayout>
  );
}