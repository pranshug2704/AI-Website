'use client';

import React, { useState, useEffect } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import ChatSidebar from './ChatSidebar';
import ChatHeader from './ChatHeader';
import { Chat, Message as MessageType, User, AIModel } from '@/app/types';
import { useChat } from '@/app/lib/hooks/useChat';
import { getAvailableProviders } from '@/app/lib/client-api';
import { setAvailableProviders } from '@/app/lib/models';

interface ChatInterfaceProps {
  initialChats: Chat[];
  currentUser: User;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  initialChats,
  currentUser,
}) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  // Fetch available providers on mount
  useEffect(() => {
    async function fetchProviders() {
      try {
        const providers = await getAvailableProviders();
        // Update the providers cache in the models module
        setAvailableProviders(providers);
      } catch (error) {
        console.error('Error fetching available providers:', error);
      }
    }
    
    fetchProviders();
  }, []);
  
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
  } = useChat(initialChats, currentUser);

  // Set first load to false after component mounts
  useEffect(() => {
    setIsFirstLoad(false);
  }, []);

  // Handle sending a message
  const handleSendMessage = (content: string) => {
    sendMessage(content);
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
        <ChatHeader
          title={activeChat.title}
          selectedModel={selectedModel}
          isMobileSidebarOpen={isMobileSidebarOpen}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
          onNewChat={handleNewChat}
        />

        {/* Messages */}
        <MessageList 
          messages={activeChat.messages} 
          isFirstLoad={isFirstLoad} 
        />

        {/* Input area */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
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