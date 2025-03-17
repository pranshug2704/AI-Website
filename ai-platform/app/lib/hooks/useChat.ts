import { useState, useEffect, useCallback, useRef } from 'react';
import { Chat, Message, User, AIModel } from '@/app/types';
import { getAvailableModels } from '@/app/lib/models';
import { useChatApi } from './useChatApi';
import { generateChatTitle as generateTitle } from '@/app/lib/chat-utils';

export const useChat = (initialChats: Chat[], currentUser: User) => {
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel | undefined>(undefined);
  const initializedRef = useRef(false);
  const saveChatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get available models based on user subscription
  const availableModels = getAvailableModels(currentUser.subscription);
  
  // Get API methods
  const { streamResponse, generateTitle } = useChatApi();

  // Save chat to server
  const saveChat = useCallback(async (chat: Chat) => {
    try {
      console.log('Saving chat to server:', chat.id);
      const response = await fetch('/api/chat/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chat }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save chat: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Chat saved successfully:', data.success);
      return data.success;
    } catch (error) {
      console.error('Error saving chat:', error);
      return false;
    }
  }, []);

  // Save active chat with debounce
  useEffect(() => {
    if (!activeChat) return;
    
    // Clear any existing timeout
    if (saveChatTimeoutRef.current) {
      clearTimeout(saveChatTimeoutRef.current);
    }
    
    // Set a new timeout to save the chat after a delay
    saveChatTimeoutRef.current = setTimeout(() => {
      saveChat(activeChat);
    }, 2000); // 2 second debounce
    
    // Cleanup the timeout on unmount or when activeChat changes
    return () => {
      if (saveChatTimeoutRef.current) {
        clearTimeout(saveChatTimeoutRef.current);
      }
    };
  }, [activeChat, saveChat]);

  // Create a new chat when there are no chats
  useEffect(() => {
    // Only run once on initial mount, and only if needed
    if (!initializedRef.current) {
      initializedRef.current = true;
      
      if (chats.length === 0) {
        // No chats, create a new one
        handleNewChat();
      } else if (chats.length > 0 && !activeChat) {
        // We have chats but none is active, set the first one as active
        setActiveChat(chats[0]);
      }
    }
  }, []);

  // Create a new chat
  const handleNewChat = useCallback(() => {
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      modelId: selectedModel?.id,
    };
    
    setChats(prevChats => [newChat, ...prevChats]);
    setActiveChat(newChat);
    return newChat;
  }, [selectedModel]);

  // Select a chat
  const handleSelectChat = useCallback((chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setActiveChat(chat);
      
      // Set selected model if chat has a modelId
      if (chat.modelId) {
        const model = availableModels.find(m => m.id === chat.modelId);
        setSelectedModel(model);
      } else {
        setSelectedModel(undefined);
      }
    }
    return chat;
  }, [chats, availableModels]);

  // Delete a chat
  const handleDeleteChat = useCallback((chatId: string) => {
    setChats(prevChats => {
      const newChats = prevChats.filter(chat => chat.id !== chatId);
      
      // If the deleted chat is the active chat, set the first chat as active
      // or create a new chat if no chats remain
      if (activeChat?.id === chatId) {
        if (newChats.length > 0) {
          // Find the next chat
          const nextChat = newChats[0];
          setActiveChat(nextChat);
        } else {
          // Create a new chat since we deleted the last one
          const newChat = {
            id: `chat-${Date.now()}`,
            title: 'New Chat',
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            modelId: selectedModel?.id,
          };
          
          setActiveChat(newChat);
          return [newChat];
        }
      }
      
      return newChats;
    });
  }, [activeChat, selectedModel]);

  // Update chat title
  const updateChatTitle = useCallback(async (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat || chat.messages.length < 2) return;

    try {
      // Generate title based on the first few messages
      const newTitle = await generateTitle(chatId, chat.messages);

      // Update chat title
      setChats(prevChats => 
        prevChats.map(c => c.id === chatId ? { ...c, title: newTitle } : c)
      );
      
      // Update active chat if it's the one being modified
      if (activeChat?.id === chatId) {
        setActiveChat(prev => prev ? { ...prev, title: newTitle } : null);
      }

      return newTitle;
    } catch (error) {
      console.error('Error updating chat title:', error);
    }
  }, [chats, activeChat, generateTitle]);

  // Update chat with new messages and save to server
  const updateChatWithMessage = useCallback((chat: Chat, updatedMessages: Message[]) => {
    const updatedChat = { 
      ...chat, 
      messages: updatedMessages,
      updatedAt: new Date()
    };
    
    setChats(prevChats => 
      prevChats.map(c => c.id === updatedChat.id ? updatedChat : c)
    );
    
    setActiveChat(updatedChat);
    
    // Save chat to server after update
    saveChat(updatedChat);
    
    return updatedChat;
  }, [saveChat]);

  // Send a message
  const sendMessage = useCallback(async (content: string, model?: AIModel) => {
    if (!activeChat) return;

    // Create user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date(),
      modelId: model?.id || selectedModel?.id,
    };

    // Create assistant message with loading state
    const assistantMessage: Message = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
      loading: true,
      modelId: model?.id || selectedModel?.id,
    };

    // Add messages to active chat
    const updatedChat = {
      ...activeChat,
      messages: [...activeChat.messages, userMessage, assistantMessage],
      updatedAt: new Date(),
      modelId: model?.id || selectedModel?.id || activeChat.modelId,
    };

    // Update chats state
    setActiveChat(updatedChat);
    setChats(prevChats => prevChats.map(c => c.id === updatedChat.id ? updatedChat : c));
    
    // If this is the first message, generate a title after a short delay
    if (activeChat.messages.length === 0) {
      setTimeout(() => updateChatTitle(activeChat.id), 2000);
    }

    setIsLoading(true);
    
    try {
      await streamResponse(
        updatedChat, 
        assistantMessage,
        // Update callback
        (updatedMessage: Message) => {
          setActiveChat(prevChat => {
            if (!prevChat) return null;
            
            const updatedMessages = [...prevChat.messages];
            const messageIndex = updatedMessages.findIndex(m => m.id === assistantMessage.id);
            
            if (messageIndex !== -1) {
              updatedMessages[messageIndex] = updatedMessage;
            }
            
            const updatedActiveChat = { ...prevChat, messages: updatedMessages };
            setChats(prevChats => 
              prevChats.map(c => c.id === updatedActiveChat.id ? updatedActiveChat : c)
            );
            
            return updatedActiveChat;
          });
        },
        // Complete callback
        (finalMessage: Message) => {
          setActiveChat(prevChat => {
            if (!prevChat) return null;
            
            const updatedMessages = [...prevChat.messages];
            const messageIndex = updatedMessages.findIndex(m => m.id === assistantMessage.id);
            
            if (messageIndex !== -1) {
              updatedMessages[messageIndex] = finalMessage;
            }
            
            const updatedChat = updateChatWithMessage(prevChat, updatedMessages);
            setIsLoading(false);
            return updatedChat;
          });
        },
        // Error callback
        (error: Error) => {
          setActiveChat(prevChat => {
            if (!prevChat) return null;
            
            const updatedMessages = [...prevChat.messages];
            const messageIndex = updatedMessages.findIndex(m => m.id === assistantMessage.id);
            
            if (messageIndex !== -1) {
              updatedMessages[messageIndex] = {
                ...assistantMessage,
                role: 'error',
                content: error.message || 'Sorry, something went wrong. Please try again.',
                loading: false,
              };
            }
            
            const updatedActiveChat = { ...prevChat, messages: updatedMessages };
            setChats(prevChats => 
              prevChats.map(c => c.id === updatedActiveChat.id ? updatedActiveChat : c)
            );
            
            setIsLoading(false);
            return updatedActiveChat;
          });
        },
        // Selected model ID
        model?.id || selectedModel?.id
      );
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  }, [activeChat, selectedModel, updateChatTitle, streamResponse, updateChatWithMessage, saveChat]);

  // Change the model
  const handleModelChange = useCallback((modelId: string) => {
    const model = availableModels.find(m => m.id === modelId);
    setSelectedModel(model);
    
    // Update active chat with new model
    if (activeChat) {
      const updatedChat = { ...activeChat, modelId };
      setActiveChat(updatedChat);
      setChats(prevChats => prevChats.map(c => c.id === updatedChat.id ? updatedChat : c));
    }
  }, [activeChat, availableModels]);

  return {
    chats,
    activeChat,
    isLoading,
    selectedModel,
    availableModels,
    handleNewChat,
    handleSelectChat,
    handleDeleteChat,
    updateChatTitle,
    sendMessage,
    handleModelChange,
  };
}; 