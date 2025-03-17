'use client';

import React, { useState } from 'react';
import { Chat } from '@/app/types';

interface ChatSidebarProps {
  chats: Chat[];
  activeChat: Chat | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onCloseMobileSidebar: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  activeChat,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onCloseMobileSidebar,
}) => {
  const [menuOpenChatId, setMenuOpenChatId] = useState<string | null>(null);
  
  // Format date for display
  const formatDate = (date: Date): string => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === now.toDateString()) {
      return 'Today';
    }
    
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Return the date in the format "Month Day"
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Group chats by date
  const groupChatsByDate = (): Record<string, Chat[]> => {
    const grouped: Record<string, Chat[]> = {};
    
    chats.forEach(chat => {
      const dateStr = formatDate(new Date(chat.updatedAt));
      
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      
      grouped[dateStr].push(chat);
    });
    
    return grouped;
  };
  
  const groupedChats = groupChatsByDate();
  
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          Chats
        </h2>
        <button
          onClick={onNewChat}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          aria-label="New Chat"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {Object.keys(groupedChats).length > 0 ? (
          Object.entries(groupedChats).map(([dateStr, dateChats]) => (
            <div key={dateStr} className="mb-4">
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
                {dateStr}
              </h3>
              <ul className="space-y-1">
                {dateChats.map(chat => (
                  <li key={chat.id}>
                    <div className="relative">
                      <button
                        className={`w-full text-left py-2 px-3 rounded-md flex items-center justify-between group ${
                          activeChat?.id === chat.id
                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                        onClick={() => {
                          onSelectChat(chat.id);
                          onCloseMobileSidebar();
                        }}
                      >
                        <div className="flex items-center overflow-hidden">
                          <span className="mr-2 text-gray-500 dark:text-gray-400">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className={`h-4 w-4 ${
                                activeChat?.id === chat.id
                                  ? 'text-primary-600 dark:text-primary-400'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                              />
                            </svg>
                          </span>
                          <span className="truncate font-medium">{chat.title}</span>
                        </div>
                        
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setMenuOpenChatId(menuOpenChatId === chat.id ? null : chat.id);
                          }}
                          className="p-1 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 focus:outline-none opacity-0 group-hover:opacity-100"
                          aria-label="Chat options"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                            />
                          </svg>
                        </button>
                      </button>
                      
                      {menuOpenChatId === chat.id && (
                        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 z-10">
                          <div className="py-1 rounded-md bg-white dark:bg-gray-800 shadow-xs border border-gray-200 dark:border-gray-700">
                            <button
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => onDeleteChat(chat.id)}
                            >
                              Delete chat
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            No chats yet. Start a new conversation!
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          New Chat
        </button>
      </div>
    </div>
  );
};

export default ChatSidebar;