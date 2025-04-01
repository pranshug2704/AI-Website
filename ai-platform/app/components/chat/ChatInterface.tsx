'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  initialChats,
  currentUser,
  initialChatId,
  selectedChat,
}) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const router = useRouter();
  const providersLoadedRef = useRef(false);
  const chatCreatedRef = useRef(false);
  
  // Fetch available providers on mount
  useEffect(() => {
    async function fetchProviders() {
      if (providersLoadedRef.current) return;
      
      try {
        const providers = await getAvailableProviders();
        // Update the providers cache in the models module
        setAvailableProviders(providers);
        providersLoadedRef.current = true;
      } catch (error) {
        console.error('Error fetching available providers:', error);
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
  } = useChat(initialChats, currentUser, initialChatId, selectedChat);

  // Initialize state from props only on first load
  useEffect(() => {
    if (!isFirstLoad) return; // Only run on first load
    
    console.log("[ChatInterface] First load initialization - Active chat:", !!activeChat);
    console.log("[ChatInterface] Initial chats:", initialChats.length);

    // Set first load to false right away to prevent multiple executions
    setIsFirstLoad(false);

    if (!activeChat && !chatCreatedRef.current) {
      if (initialChats.length > 0) {
        console.log("[ChatInterface] Setting active chat from initial chats");
        // If a specific chat is requested
        if (initialChatId && initialChatId !== 'new') {
          console.log("[ChatInterface] Looking for specific chat:", initialChatId);
          const chat = initialChats.find(c => c.id === initialChatId);
          if (chat) {
            console.log("[ChatInterface] Found requested chat, selecting it");
            handleSelectChat(chat.id);
          } else {
            console.log("[ChatInterface] Requested chat not found, using first chat");
            handleSelectChat(initialChats[0].id);
          }
        } 
        // If new chat is requested
        else if (initialChatId === 'new') {
          console.log("[ChatInterface] Creating new chat as requested");
          // Set flag before creating chat
          chatCreatedRef.current = true;
          handleNewChat();
        }
        // Default: use first chat  
        else {
          console.log("[ChatInterface] Using first chat as default");
          handleSelectChat(initialChats[0].id);
        }
      } else {
        console.log("[ChatInterface] No chats exist, creating new chat");
        chatCreatedRef.current = true;
        handleNewChat();
      }
    } else {
      console.log("[ChatInterface] Active chat already set:", activeChat ? activeChat.id : 'null');
    }
  }, [initialChats, initialChatId, activeChat, handleSelectChat, handleNewChat, isFirstLoad]);

  // Only for debugging
  useEffect(() => {
    console.log("[ChatInterface] DEBUG - Current state:");
    console.log("- initialChats:", initialChats.length);
    console.log("- chats:", chats.length);
    console.log("- activeChat:", activeChat?.id);
    console.log("- activeChat title:", activeChat?.title);
    console.log("- isFirstLoad:", isFirstLoad);
    console.log("- currentUser:", currentUser);
    
    // Add detailed logging of chat data
    if (initialChats.length > 0) {
      console.log("- Initial chats detail:", initialChats.map(c => ({ id: c.id, title: c.title })));
    }
    if (chats.length > 0) {
      console.log("- Current chats detail:", chats.map(c => ({ id: c.id, title: c.title })));
    }
  }, [chats, activeChat, initialChats, isFirstLoad, currentUser]);

  // Function to handle sending a message
  const handleSendMessage = (content: string, images?: ImageContent[]) => {
    if (content.trim() || (images && images.length > 0)) {
      sendMessage(content, images);
    }
  };

  // Extract the model ID for components that expect a string
  const getModelId = (model: AIModel | string | undefined): string => {
    if (!model) return '';
    if (typeof model === 'string') return model;
    return model.id;
  };

  if (!activeChat) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <div className="flex flex-1 flex-col md:flex-row">
        <div className={`fixed md:static w-72 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto shadow-md md:shadow-none z-[90] transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}>
          <ChatSidebar
            chats={chats || []}
            activeChat={activeChat}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
            onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
          />
        </div>
        
        <div className="flex-1 overflow-y-auto bg-background pb-[100px]">
          <div className="mx-auto flex max-w-3xl flex-col px-4 py-2 md:px-8">
            <ModelSelector selectedModelId={getModelId(selectedModel)} onSelectModel={handleModelChange} />
            
            <LocalModelInfo selectedModelId={getModelId(selectedModel)} />
          </div>

          <div className="overflow-y-auto w-full" style={{ height: 'calc(100vh - 120px)' }}>
            <MessageList 
              messages={activeChat?.messages || []} 
              isFirstLoad={isFirstLoad} 
            />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 px-0 absolute bottom-0 left-0 right-0 md:left-72">
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
    </div>
  );
};

export default ChatInterface;