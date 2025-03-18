'use client';

import React, { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import ChatSidebar from './ChatSidebar';
import ChatHeader from './ChatHeader';
import { Chat, Message as MessageType, User, AIModel, ImageContent } from '@/app/types';
import { useChat } from '@/app/lib/hooks/useChat';
import { getAvailableProviders } from '@/app/lib/client-api';
import { setAvailableProviders } from '@/app/lib/models';
import { useRouter } from 'next/navigation';

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

  // Initialize state from props
  useEffect(() => {
    console.log("INITIAL CHATS:", initialChats.length);
    
    // Only initialize if we haven't already set active chat
    if (initialChats.length > 0 && !activeChat) {
      console.log("Setting active chat from initialChats");
      // If we have a selected chat from props, use it
      if (selectedChat) {
        handleSelectChat(selectedChat.id);
      } 
      // Otherwise use the one specified by initialChatId
      else if (initialChatId && initialChatId !== 'new') {
        const chat = initialChats.find(c => c.id === initialChatId);
        if (chat) {
          handleSelectChat(chat.id);
        } else {
          handleNewChat();
        }
      } 
      // If no chat is specified, use the first one
      else if (initialChatId !== 'new') {
        handleSelectChat(initialChats[0].id);
      }
      // If 'new' is specified, create a new chat
      else {
        handleNewChat();
      }
    }
    // If we don't have any chats, create a new one
    else if (initialChats.length === 0 && !activeChat) {
      console.log("No initial chats, creating new chat");
      handleNewChat();
    }
  }, [initialChats, initialChatId, selectedChat, activeChat, handleSelectChat, handleNewChat]);

  // Set first load to false after component mounts
  useEffect(() => {
    setIsFirstLoad(false);
    console.log("INITIAL CHATS:", initialChats);
    console.log("CURRENT CHATS:", chats);
    console.log("ACTIVE CHAT:", activeChat);
  }, [chats, activeChat, initialChats]);

  // Function to handle sending a message
  const handleSendMessage = (content: string, images?: ImageContent[]) => {
    if (content.trim() || (images && images.length > 0)) {
      sendMessage(content, images);
    }
  };

  if (!activeChat) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Chat sidebar - fixed on medium and up, overlay on mobile */}
      <div
        className={`${
          isMobileSidebarOpen ? 'fixed inset-0 z-40 block' : 'hidden'
        } md:relative md:inset-auto md:block md:z-auto`}
      >
        <div
          className={`${
            isMobileSidebarOpen ? 'block' : 'hidden'
          } fixed inset-0 bg-gray-600 bg-opacity-75 md:hidden transition-opacity`}
          onClick={() => setIsMobileSidebarOpen(false)}
        ></div>
        <div className="fixed inset-y-0 left-0 flex flex-col w-72 max-w-xs bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 md:relative md:w-80">
          <ChatSidebar
            chats={chats}
            activeChat={activeChat}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
            onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
          />
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Chat header */}
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <ChatHeader 
            title={activeChat?.title || 'New Chat'} 
            selectedModel={selectedModel}
            isMobileSidebarOpen={isMobileSidebarOpen}
            setIsMobileSidebarOpen={setIsMobileSidebarOpen}
            onNewChat={handleNewChat}
          />
        </header>
        
        {/* Messages */}
        <MessageList 
          messages={activeChat.messages} 
          isFirstLoad={isFirstLoad} 
        />

        {/* Input area */}
        <div className="border-t border-gray-200 dark:border-gray-700">
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
};

export default ChatInterface;