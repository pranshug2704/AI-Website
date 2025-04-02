'use client';

import React, { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import ChatSidebar from './ChatSidebar';
import { Chat, Message as MessageType, User, AIModel, ImageContent } from '@/app/types';
import { useChat } from '@/app/lib/hooks/useChat';
import { getAvailableProviders } from '@/app/lib/client-api';
import { setAvailableProviders } from '@/app/lib/models';
import { useRouter } from 'next/navigation';
import MobileSidebarToggle from './MobileSidebarToggle';
import ChatHeader from './ChatHeader';
import ModelSelector from '../main/ModelSelector';
import LocalModelInfo from '../main/LocalModelInfo';

interface ChatInterfaceProps {
  initialChats: Chat[];
  currentUser: User;
  initialChatId?: string;
  selectedChat?: Chat | null;
  onSelectChat?: (chatId: string) => void;
  onNewChat?: () => Promise<void>;
  onDeleteChat?: (chatId: string) => Promise<void>;
}

const ChatInterface = forwardRef<ReturnType<typeof useChat>, ChatInterfaceProps>(({
  initialChats,
  currentUser,
  initialChatId,
  selectedChat,
  onSelectChat,
  onNewChat,
  onDeleteChat,
}, ref) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const router = useRouter();
  const providersLoadedRef = useRef(false);
  const chatCreatedRef = useRef(false);
  const initializedRef = useRef(false);
  const initializationStateRef = useRef({
    hasInitialized: false,
    hasCreatedChat: false,
    hasSetActiveChat: false,
    lastActiveChatId: null as string | null
  });
  
  // Add localStorage key constant
  const LAST_ACTIVE_CHAT_KEY = 'lastActiveChat';
  const CHAT_EXPIRY_HOURS = 24;
  
  // Function to store last active chat
  const storeLastActiveChat = useCallback((chatId: string) => {
    const data = {
      chatId,
      timestamp: Date.now()
    };
    localStorage.setItem(LAST_ACTIVE_CHAT_KEY, JSON.stringify(data));
  }, []);

  // Function to get last active chat if valid
  const getLastActiveChat = useCallback(() => {
    const data = localStorage.getItem(LAST_ACTIVE_CHAT_KEY);
    if (!data) return null;

    const { chatId, timestamp } = JSON.parse(data);
    const now = new Date().getTime();
    const hoursSinceLastChat = (now - timestamp) / (1000 * 60 * 60);

    // Return null if chat is older than expiry hours
    if (hoursSinceLastChat > CHAT_EXPIRY_HOURS) {
      localStorage.removeItem(LAST_ACTIVE_CHAT_KEY);
      return null;
    }

    return chatId;
  }, []);

  // Fetch available providers on mount
  useEffect(() => {
    async function fetchProviders() {
      if (providersLoadedRef.current) {
        console.log("[ChatInterface] Providers already loaded, skipping fetch");
        return;
      }
      
      try {
        console.log("[ChatInterface] Fetching available providers...");
        const providers = await getAvailableProviders();
        // Update the providers cache in the models module
        setAvailableProviders(providers);
        providersLoadedRef.current = true;
        console.log("[ChatInterface] Successfully loaded providers:", providers);
      } catch (error) {
        console.error("[ChatInterface] Error fetching available providers:", error);
      }
    }
    
    fetchProviders();
  }, []); // Empty dependency array - run once on mount
  
  const {
    chats,
    activeChat,
    isLoading,
    selectedModel,
    availableModels,
    handleNewChat,
    handleSelectChat,
    handleDeleteChat,
    sendMessage,
    handleModelChange,
    setChats,
    setActiveChat,
    setSelectedModel,
  } = useChat(initialChats, currentUser, initialChatId, selectedChat);

  // Function to handle sending a message
  const handleSendMessage = useCallback((content: string, images?: ImageContent[]) => {
    if (content.trim() || (images && images.length > 0)) {
      sendMessage(content, images);
    }
  }, [sendMessage]);

  // Extract the model ID for components that expect a string
  const getModelId = useCallback((model: AIModel | string | undefined): string => {
    if (!model) return '';
    if (typeof model === 'string') return model;
    return model.id;
  }, []);

  // Add ref for message list container
  const messageListRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [messageListKey, setMessageListKey] = useState(0);

  // Save scroll position before chat change
  const saveScrollPosition = useCallback(() => {
    if (messageListRef.current) {
      const position = messageListRef.current.scrollTop;
      setScrollPosition(position);
      console.log('[ChatInterface] Saved scroll position:', position);
    }
  }, []);

  // Function to handle chat selection
  const handleSelectChatWrapper = useCallback((chatId: string) => {
    console.log('[ChatInterface] Selecting chat:', chatId);
    
    // Save current scroll position before changing chat
    saveScrollPosition();
    
    // Update URL without page reload
    window.history.pushState({}, '', `/chat/${chatId}`);
    
    // Call the hook's handleSelectChat
    handleSelectChat(chatId);
  }, [handleSelectChat, saveScrollPosition]);

  // Function to handle new chat creation
  const handleNewChatWrapper = useCallback(async () => {
    console.log('=== [ChatInterface] New chat button clicked ===');
    console.log('[ChatInterface] Current state:', {
      isLoading,
      hasActiveChat: !!activeChat,
      activeChatId: activeChat?.id,
      chatsCount: chats.length,
      hasHandleNewChat: !!handleNewChat
    });
    
    // Prevent multiple simultaneous new chat attempts
    if (isLoading) {
      console.log('[ChatInterface] Already loading, skipping new chat creation');
      return;
    }

    try {
      console.log('[ChatInterface] Calling handleNewChat...');
      const newChat = await handleNewChat();
      console.log('[ChatInterface] handleNewChat result:', newChat);
      
      if (newChat && newChat.id) {
        console.log('[ChatInterface] New chat created:', newChat.id);
        // Update URL without page reload
        window.history.pushState({}, '', `/chat/${newChat.id}`);
        console.log('[ChatInterface] New chat creation completed');
      } else {
        console.error('[ChatInterface] Failed to create new chat - invalid chat data returned');
        throw new Error('Failed to create new chat - invalid chat data returned');
      }
    } catch (error) {
      console.error('[ChatInterface] Error creating new chat:', error);
      // Show error state or notification to user
      // You might want to add a toast notification or error message here
    }
  }, [handleNewChat, isLoading, activeChat, chats]);

  // Effect to handle scroll position restoration
  useEffect(() => {
    if (activeChat && scrollPosition > 0) {
      // Force MessageList to remount with new key
      setMessageListKey(prev => prev + 1);
      
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (messageListRef.current) {
          messageListRef.current.scrollTop = scrollPosition;
          console.log('[ChatInterface] Restored scroll position:', scrollPosition);
        }
      });
    }
  }, [activeChat, scrollPosition]);

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    chats,
    activeChat,
    isLoading,
    selectedModel,
    availableModels: [], // This will be populated by the hook
    handleNewChat,
    handleSelectChat,
    handleDeleteChat,
    updateChatTitle: async (chatId: string) => {
      // This will be implemented by the hook
      return undefined;
    },
    sendMessage: async (content: string, images?: ImageContent[]) => {
      await handleSendMessage(content, images);
    },
    setActiveChat: (chat: Chat | null) => {
      if (chat) {
        handleSelectChat(chat.id);
      }
    },
    deleteChat: handleDeleteChat,
    createNewChat: handleNewChat,
    getModelsWithAvailability: () => {
      // This will be implemented by the hook
      return [];
    },
    handleModelChange: (modelId: string) => {
      // This will be implemented by the hook
    },
    availableProviders: [],
    setChats,
    setSelectedModel
  }), [chats, activeChat, isLoading, selectedModel, handleNewChat, handleSelectChat, handleDeleteChat, handleSendMessage, setChats, setSelectedModel]);

  // Initialize chat on mount
  useEffect(() => {
    console.log('[ChatInterface] Initialization effect triggered');
    console.log('[ChatInterface] Current state:', {
      hasActiveChat: !!activeChat,
      activeChatId: activeChat?.id,
      initialized: initializedRef.current,
      initialChatsCount: initialChats.length,
      initialChatId,
      hasInitialSelectedChat: !!selectedChat,
      initializationState: initializationStateRef.current
    });
    
    // Skip if already initialized
    if (initializationStateRef.current.hasInitialized) {
      console.log('[ChatInterface] Already initialized, skipping');
      return;
    }
    
    // If we already have an active chat, mark as initialized
    if (activeChat) {
      console.log('[ChatInterface] Already have active chat, marking as initialized:', activeChat.id);
      initializationStateRef.current.hasInitialized = true;
      return;
    }
    
    // Process in order of priority:
    // 1. If we have an explicitly selected chat, use it
    if (selectedChat) {
      console.log('[ChatInterface] Using provided selected chat:', selectedChat.id);
      handleSelectChat(selectedChat.id);
      initializationStateRef.current.hasInitialized = true;
      return;
    }
    
    // 2. If we have a specific chat ID, try to find and select it
    if (initialChatId && initialChatId !== 'new') {
      console.log('[ChatInterface] Looking for chat with ID:', initialChatId);
      const chat = initialChats.find(c => c.id === initialChatId);
      if (chat) {
        console.log('[ChatInterface] Found chat with ID, selecting:', chat.id);
        handleSelectChat(chat.id);
        initializationStateRef.current.hasInitialized = true;
        return;
      } else {
        console.log('[ChatInterface] Chat with ID not found:', initialChatId);
      }
    }
    
    // 3. If we have chats, use the first one
    if (initialChats.length > 0) {
      console.log('[ChatInterface] Using first chat:', initialChats[0].id);
      handleSelectChat(initialChats[0].id);
      initializationStateRef.current.hasInitialized = true;
      return;
    }
    
    // 4. Only create a new chat if explicitly requested and we haven't created one yet
    if (initialChatId === 'new' && !initializationStateRef.current.hasCreatedChat) {
      console.log('[ChatInterface] New chat explicitly requested via URL');
      
      // Set flags to prevent multiple attempts
      initializationStateRef.current.hasCreatedChat = true;
      initializationStateRef.current.hasInitialized = true;
      
      // Create new chat
      handleNewChat().then(newChat => {
        if (newChat) {
          console.log('[ChatInterface] New chat created successfully:', newChat.id);
          // Update URL without page reload
          window.history.pushState({}, '', `/chat/${newChat.id}`);
        }
      });
      return;
    }

    // If we get here, something went wrong - mark as initialized to prevent further attempts
    console.log('[ChatInterface] No valid chat found, marking as initialized to prevent further attempts');
    initializationStateRef.current.hasInitialized = true;
  }, [initialChats, initialChatId, selectedChat, handleNewChat, handleSelectChat, activeChat]);

  // Only for debugging
  useEffect(() => {
    console.log("[ChatInterface] DEBUG - Current state:");
    console.log("- initialChats:", initialChats.length);
    console.log("- chats:", chats.length);
    console.log("- activeChat:", activeChat?.id);
    console.log("- activeChat title:", activeChat?.title);
    console.log("- isFirstLoad:", isFirstLoad);
    console.log("- currentUser:", currentUser);
    console.log("- initializationState:", initializationStateRef.current);
    
    // Add detailed logging of chat data
    if (initialChats.length > 0) {
      console.log("- Initial chats detail:", initialChats.map(c => ({ id: c.id, title: c.title })));
    }
    if (chats.length > 0) {
      console.log("- Current chats detail:", chats.map(c => ({ id: c.id, title: c.title })));
    }
  }, [chats, activeChat, initialChats, isFirstLoad, currentUser]);

  // Show loading state only if we have no chats or no active chat
  if (!chats.length) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading chats...</p>
        </div>
      </div>
    );
  }

  // Show loading state if we have chats but no active chat and we're not initialized
  if (!activeChat && !initializationStateRef.current.hasInitialized) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Initializing chat...</p>
        </div>
      </div>
    );
  }

  return (
    // Outermost container: Use calc to subtract likely navbar height (e.g., 4rem)
    <div className="flex h-[calc(100vh-4rem)] bg-background">

      {/* Sidebar Container: Fixed width, full height, handles its own internal scroll */}
      <div className={`w-72 h-full flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-md ${
          isMobileSidebarOpen ? 'fixed md:static z-[90] translate-x-0' : 'fixed md:static z-[90] -translate-x-full md:translate-x-0'
        } transition-transform duration-300 ease-in-out`}>
        {/* ChatSidebar component should handle its internal header/list layout and scrolling */}
        <ChatSidebar
          chats={chats || []}
          activeChat={activeChat}
          onSelectChat={handleSelectChatWrapper}
          onNewChat={handleNewChatWrapper}
          onDeleteChat={handleDeleteChat}
          onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
        />
      </div>

      {/* Main Content Container: Takes remaining width, column layout, clips overflow */}
      <div className="flex flex-1 flex-col overflow-hidden bg-background">

        {/* Header Area: Fixed height */}
        <div className="flex-shrink-0 mx-auto flex w-full max-w-3xl flex-col px-4 py-2 md:px-8">
          <ModelSelector selectedModelId={getModelId(selectedModel)} onSelectModel={handleModelChange} />
          <LocalModelInfo selectedModelId={getModelId(selectedModel)} />
        </div>

        {/* Message List Area: Takes remaining height, scrolls internally */}
        <div 
          ref={messageListRef}
          className="flex-1 overflow-y-auto w-full scroll-smooth"
        >
          <MessageList
            key={messageListKey}
            messages={activeChat?.messages || []}
            isFirstLoad={isFirstLoad}
            initialScrollPosition={scrollPosition}
          />
        </div>

        {/* Input Area: Fixed height */}
        <div className="flex-shrink-0 border-t border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 py-2 px-0">
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            selectedModel={selectedModel}
            availableModels={availableModels}
            onModelChange={handleModelChange}
          />
        </div>
      </div>
    </div>
  );
});

ChatInterface.displayName = 'ChatInterface';

export default ChatInterface;