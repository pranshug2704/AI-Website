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
    
    // Enhanced debug logging
    console.log(`[ChatSidebar] Grouping ${chats ? chats.length : 0} chats by date`);
    
    // Extra check for empty chats or undefined
    if (!chats || !Array.isArray(chats) || chats.length === 0) {
      console.log('[ChatSidebar] No chats to display');
      return grouped;
    }
    
    // Use today's date as a fallback for any chat that might have date issues
    const today = formatDate(new Date());
    
    // Process all chats with better error handling
    for (let i = 0; i < chats.length; i++) {
      try {
        const chat = chats[i];
        
        if (!chat) {
          console.error(`Invalid chat at index ${i}`);
          continue;
        }
        
        // Ensure chat.updatedAt is a valid Date
        let chatDate: Date;
        
        // Try to convert string to Date if needed
        if (typeof chat.updatedAt === 'string') {
          chatDate = new Date(chat.updatedAt);
        } else if (chat.updatedAt instanceof Date) {
          chatDate = chat.updatedAt;
        } else {
          // Fallback to current date
          console.log(`[ChatSidebar] Chat ${i} has invalid date, using current date`);
          chatDate = new Date();
        }
        
        // Check if date is valid
        if (isNaN(chatDate.getTime())) {
          console.log(`[ChatSidebar] Chat ${i} has invalid date value, using current date`);
          chatDate = new Date();
        }
        
        const dateStr = formatDate(chatDate);
        
        if (!grouped[dateStr]) {
          grouped[dateStr] = [];
        }
        
        grouped[dateStr].push(chat);
      } catch (error) {
        // If there's any error processing a chat, put it in today's group
        console.error(`Error processing chat ${i}:`, error);
        
        if (!grouped[today]) {
          grouped[today] = [];
        }
        
        if (chats[i]) {
          grouped[today].push(chats[i]);
        }
      }
    }
    
    // Ensure we have at least one group if we have chats
    if (Object.keys(grouped).length === 0 && chats.length > 0) {
      // Fallback: put all chats in today's group
      console.log(`[ChatSidebar] Fallback: placing all ${chats.length} chats in today's group`);
      grouped[today] = [...chats];
    }
    
    // Log the result
    console.log(`[ChatSidebar] Grouped into ${Object.keys(grouped).length} date sections`);
    Object.keys(grouped).forEach(date => {
      console.log(`[ChatSidebar] ${date}: ${grouped[date].length} chats`);
    });
    
    return grouped;
  };
  
  const groupedChats = groupChatsByDate();
  
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          Chats ({chats?.length || 0})
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
      
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-140px)] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500 pb-4">
        {Object.keys(groupedChats).length > 0 ? (
          Object.entries(groupedChats).map(([date, chatsForDate]) => (
            <div key={date} className="mt-2">
              <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 px-4 py-2 sticky top-0 bg-white dark:bg-gray-800 z-10">
                {date}
              </h3>
              <ul className="space-y-1 px-2">
                {chatsForDate.map(chat => (
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
          <div>
            {/* Fallback if grouping doesn't work: direct list of chats */}
            {chats && chats.length > 0 ? (
              <div className="mt-2">
                <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 px-4 py-2">
                  Today
                </h3>
                <ul className="space-y-1 px-2">
                  {chats.map(chat => (
                    <li key={chat.id}>
                      <button
                        className={`w-full text-left py-2 px-3 rounded-md flex items-center justify-between ${
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
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                No chats yet. Start a new conversation!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;