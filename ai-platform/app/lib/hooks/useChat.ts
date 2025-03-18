import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Chat, 
  Message, 
  User, 
  AIModel, 
  MessageRole,
  ImageContent,
  MessageContentType
} from '@/app/types';
import { getAvailableModels, getModelById, getModelsForTask, detectTaskType } from '../models';
import { useChatApi } from './useChatApi';
import { generateChatTitle as generateTitle } from '@/app/lib/chat-utils';

export const useChat = (
  initialChats: Chat[], 
  currentUser: User,
  initialChatId?: string,
  initialSelectedChat?: Chat | null
) => {
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [activeChat, setActiveChat] = useState<Chat | null>(initialSelectedChat || null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel | undefined>(undefined);
  const initializedRef = useRef(false);
  const saveChatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [userTier, setUserTier] = useState<'free' | 'pro' | 'enterprise'>('free');
  const providersLoadedRef = useRef(false);
  
  // Get available models based on user subscription
  const availableModels = getAvailableModels(currentUser.subscription);
  
  // Get API methods
  const { streamResponse, generateTitle } = useChatApi();

  // Save chat to server
  const saveChat = useCallback(async (chat: Chat) => {
    try {
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

  // Create a new chat
  const handleNewChat = useCallback(async () => {
    try {
      // Create a new chat on the server first
      const response = await fetch('/api/chat/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New Chat',
          modelId: selectedModel?.id
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create chat: ${response.status}`);
      }
      
      const { chat } = await response.json();
      
      // Convert server chat format to frontend format
      const newChat: Chat = {
        id: chat.id,
        title: chat.title,
        messages: [],
        createdAt: new Date(chat.createdAt),
        updatedAt: new Date(chat.updatedAt),
        modelId: chat.modelId,
        userId: currentUser.id
      };
      
      setChats(prevChats => [newChat, ...prevChats]);
      setActiveChat(newChat);
      return newChat;
    } catch (error) {
      console.error('Error creating new chat:', error);
      
      // Fallback to local chat creation if server creation fails
      const fallbackChat: Chat = {
        id: `chat-${Date.now()}`,
        title: 'New Chat',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        modelId: selectedModel?.id,
        userId: currentUser.id
      };
      
      setChats(prevChats => [fallbackChat, ...prevChats]);
      setActiveChat(fallbackChat);
      return fallbackChat;
    }
  }, [selectedModel, currentUser.id]);

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
  const handleDeleteChat = useCallback(async (chatId: string) => {
    try {
      // Delete the chat from the server
      const response = await fetch(`/api/chat/history?id=${chatId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete chat: ${response.status}`);
      }
      
      // Remove the chat from state
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
      
      // If we deleted the active chat, switch to another chat or create a new one
      if (activeChat && activeChat.id === chatId) {
        if (chats.length > 1) {
          // Find the next chat to set as active (first chat that's not the deleted one)
          const nextChat = chats.find(chat => chat.id !== chatId);
          if (nextChat) {
            setActiveChat(nextChat);
          } else {
            handleNewChat();
          }
        } else {
          handleNewChat();
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting chat:', error);
      return false;
    }
  }, [chats, activeChat, handleNewChat]);

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

  // Fetch available providers from the API
  useEffect(() => {
    async function fetchAvailableProviders() {
      if (providersLoadedRef.current) return;
      
      try {
        const response = await fetch('/api/models/available');
        if (response.ok) {
          const data = await response.json();
          setAvailableProviders(data.providers || []);
          providersLoadedRef.current = true;
        } else {
          console.error('Failed to fetch available providers');
        }
      } catch (error) {
        console.error('Error fetching available providers:', error);
      }
    }

    fetchAvailableProviders();
  }, []); // Only run once on mount

  // Get available models based on user tier and available providers
  const getModelsWithAvailability = useCallback(() => {
    // Get models based on user tier
    const models = getAvailableModels(userTier);
    
    // Filter and mark models based on provider availability
    return models.map(model => ({
      ...model,
      providerAvailable: availableProviders.includes(model.provider.toLowerCase())
    })).sort((a, b) => {
      // Sort by availability first, then by tier
      if (a.providerAvailable && !b.providerAvailable) return -1;
      if (!a.providerAvailable && b.providerAvailable) return 1;
      
      // Then by tier (pro > enterprise > free)
      const tierOrder = { pro: 0, enterprise: 1, free: 2 };
      return tierOrder[a.tier as keyof typeof tierOrder] - tierOrder[b.tier as keyof typeof tierOrder];
    });
  }, [userTier, availableProviders]);

  // Function to send a message
  const sendMessage = useCallback(async (content: string, imageData?: ImageContent[], modelId?: string) => {
    if (!activeChat) return;

    try {
      setIsLoading(true);
      
      const trimmedContent = content.trim();
      
      // Create a temporary user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user' as MessageRole,
        content: trimmedContent, // Always include the text content
        contentType: imageData && imageData.length > 0 ? 'multipart' as MessageContentType : 'text' as MessageContentType,
        images: imageData,
        createdAt: new Date(),
      };

      // Create a temporary assistant message
      const tempAssistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant' as MessageRole,
        content: '',
        contentType: 'text' as MessageContentType,
        loading: true,
        createdAt: new Date(),
      };

      // Update the chat with the new messages
      const updatedChat: Chat = {
        ...activeChat,
        messages: [...activeChat.messages, userMessage, tempAssistantMessage],
        updatedAt: new Date(),
      };
      
      // Update the active chat
      setActiveChat(updatedChat);

      // Update the chats array
      setChats((prevChats) => {
        return prevChats.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat));
      });

      // Get the most appropriate model based on the prompt and available models
      let selectedModelId = modelId;
      
      // If auto-select, determine the best model for the task
      if (!selectedModelId || selectedModelId === 'auto-select') {
        const availableModelsWithProviders = getModelsWithAvailability();
        const taskType = detectTaskType(content);
        
        // Get models suitable for this task
        const modelsForTask = getModelsForTask(taskType, userTier);
        
        // Filter by available providers
        const availableModelsForTask = modelsForTask
          .filter(model => availableProviders.includes(model.provider.toLowerCase()));
        
        // Select the first available model for the task, or fall back to any available model
        selectedModelId = availableModelsForTask.length > 0 
          ? availableModelsForTask[0].id
          : (availableModelsWithProviders.find(m => m.providerAvailable)?.id || modelsForTask[0].id);
      }

      const model = getModelById(selectedModelId || '') || getModelsForTask('general', userTier)[0];

      // Call the chat API to send the message
      const chatApi = useChatApi();
      
      await chatApi.streamResponse(
        updatedChat,
        tempAssistantMessage,
        // Update callback
        (updatedMessage: Message) => {
          setActiveChat(prevChat => {
            if (!prevChat) return null;
            
            const updatedMessages = prevChat.messages.map(msg => 
              msg.id === tempAssistantMessage.id ? updatedMessage : msg
            );
            
            return { ...prevChat, messages: updatedMessages };
          });
        },
        // Complete callback
        (finalMessage: Message) => {
          setActiveChat(prevChat => {
            if (!prevChat) return null;
            
            const updatedMessages = prevChat.messages.map(msg => 
              msg.id === tempAssistantMessage.id ? { ...finalMessage, loading: false } : msg
            );
            
            const updatedChat = { ...prevChat, messages: updatedMessages };
            setChats(prevChats => 
              prevChats.map(c => c.id === updatedChat.id ? updatedChat : c)
            );
            
            setIsLoading(false);
            updateChatTitle(activeChat.id);
            return updatedChat;
          });
        },
        // Error callback
        (error: Error) => {
          setActiveChat(prevChat => {
            if (!prevChat) return null;
            
            const errorMessages = prevChat.messages.map(msg => 
              msg.id === tempAssistantMessage.id 
                ? { 
                    ...msg, 
                    role: 'error' as MessageRole,
                    content: error.message || 'An error occurred while generating the response.', 
                    loading: false 
                  } 
                : msg
            );
            
            const updatedChat = { ...prevChat, messages: errorMessages };
            setChats(prevChats => 
              prevChats.map(c => c.id === updatedChat.id ? updatedChat : c)
            );
            
            setIsLoading(false);
            return updatedChat;
          });
        },
        selectedModelId
      );
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  }, [activeChat, setChats, setActiveChat, updateChatTitle, getModelsWithAvailability, userTier, availableProviders, useChatApi]);

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

  // Initialize from chats and initialChatId on mount - must come after all function declarations
  useEffect(() => {
    if (!initializedRef.current) {
      // If we have an initial selected chat, use it
      if (initialSelectedChat) {
        setActiveChat(initialSelectedChat);
        initializedRef.current = true;
        return;
      }
      
      // If we have an initialChatId, try to find and select that chat
      if (initialChatId && initialChatId !== 'new') {
        const chat = initialChats.find(c => c.id === initialChatId);
        if (chat) {
          setActiveChat(chat);
          initializedRef.current = true;
          return;
        }
      }
      
      // Otherwise handle as before
      if (initialChats.length > 0 && !activeChat) {
        // Set the most recent chat as active
        setActiveChat(initialChats[0]);
      } else if (initialChats.length === 0 || initialChatId === 'new') {
        // No chats exist or specifically requested new chat, create a new one
        handleNewChat();
      }
      initializedRef.current = true;
    }
  }, [initialChats, activeChat, handleNewChat, initialChatId, initialSelectedChat]);

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
    availableProviders,
    getModelsWithAvailability,
  };
}; 