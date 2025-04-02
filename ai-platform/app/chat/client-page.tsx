'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ChatInterface from '../components/chat/ChatInterface';
import { useChat } from '../lib/hooks/useChat';
import { useAuth } from '../lib/auth-context';
import { Chat } from '../types';
import RootLayout from '../components/RootLayout';

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
  const { user, loading, refreshSession } = useAuth();
  const params = useParams();
  const chatId = params?.chatId as string;
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reconnecting = useReconnectionHandler();
  const chatInterfaceRef = useRef<ReturnType<typeof useChat> | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      console.log('[ClientChatPage] No user, redirecting to login');
      router.push('/login');
      return;
    }
  }, [user, router]);

  // Refresh session when component mounts to ensure we have the latest session data
  useEffect(() => {
    if (!loading) {
      console.log("[ClientChatPage] Refreshing session on mount");
      refreshSession();
    }
  }, [loading, refreshSession]);

  // Load all chats on first render or when user changes
  useEffect(() => {
    let isMounted = true;
    let fetchTimeout: NodeJS.Timeout | null = null;
    let isFetching = false;
    
    async function fetchAllChats() {
      if (!user || !user.id) {
        console.log("[ClientChatPage] No user available, skipping chat fetch");
        return;
      }
      
      if (isFetching) {
        console.log("[ClientChatPage] Already fetching chats, skipping duplicate request");
        return;
      }
      
      console.log("[ClientChatPage] Fetching chats for user:", user.id);
      
      try {
        isFetching = true;
        console.log("[ClientChatPage] Fetching all chat history...");
        setIsLoadingChats(true);
        
        // Add a timestamp to avoid caching issues
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/chat/history?_=${timestamp}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("[ClientChatPage] API response not OK:", response.status, errorText);
          
          if (response.status === 401) {
            console.log("[ClientChatPage] Session expired, refreshing...");
            await refreshSession();
            if (isMounted) {
              setError("Your session expired. Please try again.");
            }
            return;
          }
          
          try {
            const error = JSON.parse(errorText);
            throw new Error(error.error || 'Failed to fetch chats');
          } catch (e) {
            throw new Error(`HTTP Error ${response.status}: ${errorText}`);
          }
        }
        
        const data = await response.json();
        
        // Only update state if component is still mounted
        if (isMounted) {
          console.log(`[ClientChatPage] Fetched ${data.chats?.length || 0} chats from server`);
          
          if (!data.chats || data.chats.length === 0) {
            console.log("[ClientChatPage] No chats returned from server");
          } else {
            console.log("[ClientChatPage] First chat from API:", data.chats[0]);
          }
          
          // Process dates as they come as strings from the API
          const processedChats = (data.chats || [])
            .filter((chat: any) => {
              // Keep the chat if:
              // 1. It has messages, or
              // 2. It's not titled "New Chat"
              // 3. It's not empty (no messages and no title)
              const hasMessages = chat.messages?.length > 0;
              const hasCustomTitle = chat.title && chat.title !== 'New Chat';
              const isValid = hasMessages || hasCustomTitle;
              
              if (!isValid) {
                console.log(`[ClientChatPage] Filtering out invalid chat:`, {
                  id: chat.id,
                  title: chat.title,
                  messageCount: chat.messages?.length || 0
                });
              }
              
              return isValid;
            })
            .map((chat: any) => ({
              ...chat,
              createdAt: new Date(chat.createdAt),
              updatedAt: new Date(chat.updatedAt),
              messages: (chat.messages || []).map((msg: any) => ({
                ...msg,
                createdAt: new Date(msg.createdAt)
              }))
            }));
          
          // Add additional logging
          console.log(`[ClientChatPage] Processed ${processedChats.length} chats after filtering empty ones`);
          if (processedChats.length > 0) {
            console.log('[ClientChatPage] First processed chat:', 
              {id: processedChats[0].id, title: processedChats[0].title, msgCount: processedChats[0].messages.length});
          }
          
          setChats(processedChats);

          // Handle selected chat based on chatId or last active chat
          let chatToSelect: Chat | null = null;
          
          // If we're on the base /chat route and have chats, use the last active or first chat
          if (!chatId && processedChats.length > 0) {
            console.log("[ClientChatPage] On base chat route, finding appropriate chat");
            // Try to get last active chat from localStorage
            const lastActiveChatData = localStorage.getItem('lastActiveChat');
            if (lastActiveChatData) {
              try {
                const { chatId: lastChatId, timestamp } = JSON.parse(lastActiveChatData);
                const now = new Date().getTime();
                const hoursSinceLastChat = (now - timestamp) / (1000 * 60 * 60);
                
                console.log("[ClientChatPage] Found last active chat data:", { lastChatId, hoursSinceLastChat });
                
                if (hoursSinceLastChat <= 24) {
                  chatToSelect = processedChats.find((c: Chat) => c.id === lastChatId) || null;
                  if (chatToSelect) {
                    console.log("[ClientChatPage] Using last active chat:", chatToSelect.id);
                  }
                } else {
                  console.log("[ClientChatPage] Last active chat expired");
                  localStorage.removeItem('lastActiveChat');
                }
              } catch (error) {
                console.error("[ClientChatPage] Error parsing last active chat:", error);
                localStorage.removeItem('lastActiveChat');
              }
            }
            
            // If no valid last active chat, use the first chat
            if (!chatToSelect) {
              chatToSelect = processedChats[0];
              console.log("[ClientChatPage] Using first chat:", chatToSelect?.id || 'unknown');
            }
          }
          // If we have a specific chatId, try to find that chat
          else if (chatId && chatId !== 'new') {
            console.log("[ClientChatPage] Looking for specific chat with ID:", chatId);
            chatToSelect = processedChats.find((c: Chat) => c.id === chatId) || null;
            if (chatToSelect) {
              console.log("[ClientChatPage] Found requested chat:", chatToSelect.id);
            } else {
              console.log("[ClientChatPage] Requested chat not found, using first chat");
              // If requested chat not found, use first chat
              if (processedChats.length > 0) {
                chatToSelect = processedChats[0];
              }
            }
          }
          // Handle explicit new chat request
          else if (chatId === 'new') {
            console.log("[ClientChatPage] New chat explicitly requested");
            setSelectedChat(null);
          }
          
          // Update selected chat state and URL
          if (chatToSelect) {
            console.log("[ClientChatPage] Setting selected chat:", chatToSelect.id);
            setSelectedChat(chatToSelect);
            // Store as last active chat
            const data = {
              chatId: chatToSelect.id,
              timestamp: new Date().getTime()
            };
            localStorage.setItem('lastActiveChat', JSON.stringify(data));
            
            // Update URL if needed
            if (chatId !== chatToSelect.id) {
              console.log("[ClientChatPage] Updating URL to match selected chat");
              router.push(`/chat/${chatToSelect.id}`);
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
          isFetching = false;
        }
      }
    }
    
    if (user) {
      // Clear any existing timeout
      if (fetchTimeout) {
        clearTimeout(fetchTimeout);
      }
      
      // Set a new timeout to fetch chats after a short delay
      // This helps prevent multiple rapid fetches during initialization
      fetchTimeout = setTimeout(() => {
        fetchAllChats();
      }, 100);
    }
    
    return () => {
      isMounted = false;
      if (fetchTimeout) {
        clearTimeout(fetchTimeout);
      }
    };
  }, [user, refreshSession, chatId, router]);

  // Handle chat selection
  const handleSelectChat = useCallback((chatId: string) => {
    console.log('[ClientChatPage] Selecting chat:', chatId);
    
    // Find the chat in our list
    const chat = chats.find(c => c.id === chatId);
    
    if (chat) {
      console.log('[ClientChatPage] Found chat, updating state and URL');
      
      // Update selected chat state
      setSelectedChat(chat);
      
      // Update URL to reflect selected chat
      router.push(`/chat/${chatId}`);
      
      // Call the hook's handleSelectChat
      chatInterfaceRef.current?.handleSelectChat(chatId);
    } else {
      console.error('[ClientChatPage] Chat not found with ID:', chatId);
    }
  }, [router, chats]);

  // Initialize chat interface ref
  useEffect(() => {
    if (!chatInterfaceRef.current && user) {
      console.log('[ClientChatPage] Initializing chatInterfaceRef');
      console.log('[ClientChatPage] Current state:', {
        chatsCount: chats.length,
        chatId,
        selectedChat: selectedChat?.id,
        user: user.id,
        initialized: chatInterfaceRef.current?.initialized
      });
      
      chatInterfaceRef.current = useChat(chats, user, chatId, selectedChat);
      console.log('[ClientChatPage] chatInterfaceRef initialized:', {
        initialized: chatInterfaceRef.current.initialized,
        hasActiveChat: !!chatInterfaceRef.current.activeChat,
        activeChatId: chatInterfaceRef.current.activeChat?.id
      });
    }
  }, [chats, user, chatId, selectedChat]);

  // Handle new chat creation
  const handleNewChat = useCallback(async () => {
    console.log('=== [ClientChatPage] Creating new chat ===');
    console.log('[ClientChatPage] Current state:', {
      selectedChat: selectedChat?.id,
      chatsCount: chats.length,
      chatId: params.chatId,
      chatInterfaceRef: !!chatInterfaceRef.current,
      user: user?.id,
      initialized: chatInterfaceRef.current?.initialized
    });
    
    try {
      // Create new chat first
      console.log('[ClientChatPage] Calling chatInterface.handleNewChat...');
      if (!chatInterfaceRef.current) {
        console.error('[ClientChatPage] chatInterfaceRef is not initialized');
        return;
      }
      
      const newChat = await chatInterfaceRef.current.handleNewChat();
      console.log('[ClientChatPage] handleNewChat result:', newChat);
      
      if (newChat) {
        console.log('[ClientChatPage] New chat created:', newChat.id);
        
        // Update chats state to include the new chat
        console.log('[ClientChatPage] Updating chats state...');
        setChats(prevChats => {
          if (prevChats.some(c => c.id === newChat.id)) {
            console.log('[ClientChatPage] Chat already exists in chats array');
            return prevChats;
          }
          console.log('[ClientChatPage] Adding new chat to chats array');
          return [newChat, ...prevChats];
        });
        
        // Update selected chat state
        console.log('[ClientChatPage] Updating selected chat state...');
        setSelectedChat(newChat);
        
        // Update URL after successful chat creation
        console.log('[ClientChatPage] Updating URL...');
        router.push(`/chat/${newChat.id}`, { scroll: false });
        
        // Store as last active chat
        console.log('[ClientChatPage] Storing last active chat...');
        const data = {
          chatId: newChat.id,
          timestamp: new Date().getTime()
        };
        localStorage.setItem('lastActiveChat', JSON.stringify(data));
        
        console.log('[ClientChatPage] New chat creation completed successfully');
      } else {
        console.error('[ClientChatPage] Failed to create new chat');
      }
    } catch (error) {
      console.error('[ClientChatPage] Error creating new chat:', error);
    }
  }, [router, selectedChat, chats, params.chatId, user]);

  // Handle chat deletion
  const handleDeleteChat = useCallback(async (chatId: string) => {
    console.log('[ClientChatPage] Deleting chat:', chatId);
    
    // Call the hook's handleDeleteChat
    const success = await chatInterfaceRef.current?.handleDeleteChat(chatId);
    
    if (success) {
      // If we deleted the active chat, redirect to /chat
      if (chatInterfaceRef.current?.activeChat?.id === chatId) {
        router.push('/chat');
      }
    }
  }, [router]);

  // Initialize chat selection based on URL
  useEffect(() => {
    const chatId = params.chatId as string;
    console.log('[ClientChatPage] URL changed:', chatId);
    
    // Skip if no chat ID in URL
    if (!chatId) {
      console.log('[ClientChatPage] No chat ID in URL, skipping selection');
      return;
    }
    
    // If we have a chat ID, select it
    if (chatId !== 'new') {
      console.log('[ClientChatPage] Selecting chat from URL:', chatId);
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        setSelectedChat(chat);
        chatInterfaceRef.current?.handleSelectChat(chatId);
      }
    }
  }, [params.chatId, chats]);

  // Handle new chat creation when URL is /chat/new
  useEffect(() => {
    const chatId = params.chatId as string;
    if (chatId === 'new') {
      console.log('[ClientChatPage] New chat requested via URL');
      // Only create a new chat if we don't already have one selected
      if (!selectedChat) {
        handleNewChat();
      }
    }
  }, [params.chatId, handleNewChat, selectedChat]);

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

  if (error) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
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
      {isLoadingChats ? (
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
          ref={chatInterfaceRef}
          initialChats={chats}
          initialChatId={chatId}
          selectedChat={selectedChat}
          currentUser={user}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
        />
      )}
    </RootLayout>
  );
}