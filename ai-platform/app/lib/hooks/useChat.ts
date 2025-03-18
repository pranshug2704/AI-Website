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
  const [chats, setChats] = useState<Chat[]>(initialChats || []);
  const [activeChat, setActiveChat] = useState<Chat | null>(initialSelectedChat || null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel | undefined>(undefined);
  const initializedRef = useRef(false);
  const saveChatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [userTier, setUserTier] = useState<'free' | 'pro' | 'enterprise'>('free');
  const providersLoadedRef = useRef(false);
  
  console.log('[useChat] Hook initialized with:', {
    initialChatsCount: initialChats?.length || 0,
    initialChatId,
    hasInitialSelectedChat: !!initialSelectedChat,
    currentUserId: currentUser?.id
  });
  
  // Initialize with initialChats whenever they change
  useEffect(() => {
    if (initialChats && initialChats.length > 0) {
      console.log(`[useChat] Setting ${initialChats.length} initial chats`);
      setChats(initialChats);
    }
  }, [initialChats]);
  
  // Set initial active chat if provided
  useEffect(() => {
    if (initialSelectedChat && !activeChat) {
      console.log('[useChat] Setting initial selected chat:', initialSelectedChat.id);
      setActiveChat(initialSelectedChat);
    }
  }, [initialSelectedChat, activeChat]);
  
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

  // Select a specific chat
  const handleSelectChat = useCallback((chatId: string) => {
    console.log('[useChat] Selecting chat with ID:', chatId);
    
    const chat = chats.find(c => c.id === chatId);
    
    if (chat) {
      console.log('[useChat] Chat found, setting as active chat');
      setActiveChat(chat);
      
      // Set selected model if chat has a modelId
      if (chat.modelId) {
        const model = availableModels.find(m => m.id === chat.modelId);
        setSelectedModel(model);
      } else {
        setSelectedModel(undefined);
      }
    } else {
      console.error('[useChat] Chat not found with ID:', chatId);
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
    console.log(`[useChat] Attempting to update title for chat: ${chatId}`);
    
    const chat = chats.find(c => c.id === chatId);
    if (!chat) {
      console.log(`[useChat] Chat not found in state: ${chatId}`);
      return;
    }
    
    if (chat.messages.length < 1) {
      console.log(`[useChat] Chat has no messages, skipping title update: ${chatId}`);
      return;
    }

    // Don't update if chat already has a non-default title
    if (chat.title && chat.title !== 'New Chat') {
      console.log(`[useChat] Chat already has a custom title: "${chat.title}", skipping update`);
      return;
    }

    try {
      console.log(`[useChat] Generating title for chat with ${chat.messages.length} messages`);
      
      // Generate title based on the first few messages
      const newTitle = await generateTitle(chatId, chat.messages);
      console.log(`[useChat] Generated new title: "${newTitle}"`);

      if (!newTitle || newTitle === 'New Chat') {
        console.log(`[useChat] Title generation returned default title, skipping update`);
        return;
      }

      // Update chat title in local state
      console.log(`[useChat] Updating title in state from "${chat.title}" to "${newTitle}"`);
      
      // Create updated chat object with new title
      const updatedChat = { ...chat, title: newTitle };
      
      // Update chat title in state
      setChats(prevChats => 
        prevChats.map(c => c.id === chatId ? updatedChat : c)
      );
      
      // Update active chat if it's the one being modified
      if (activeChat?.id === chatId) {
        setActiveChat(updatedChat);
      }
      
      // Save the updated chat to the server immediately
      console.log(`[useChat] Saving updated chat title to server`);
      await saveChat(updatedChat);

      return newTitle;
    } catch (error) {
      console.error('[useChat] Error updating chat title:', error);
    }
  }, [chats, activeChat, generateTitle, saveChat]);

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

      // Create a temporary user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user' as MessageRole,
        content,
        contentType: imageData && imageData.length > 0 ? 'image' as MessageContentType : 'text' as MessageContentType,
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

      // If this is the first message and the title is "New Chat",
      // update the title immediately using the message content
      if (activeChat.messages.length === 0 && activeChat.title === 'New Chat' && content.trim().length > 0) {
        // Create title from the user message
        const title = content.length > 30 ? content.substring(0, 30) + '...' : content;
        console.log(`[useChat] Creating title from first message: "${title}"`);
        
        // Update chat with title
        updatedChat.title = title;
        
        // Also initiate a direct title update on the server
        try {
          fetch('/api/chat/updateTitle', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chatId: activeChat.id,
              title
            }),
          }).then(response => {
            if (!response.ok) {
              console.error(`[useChat] Failed to update title directly: ${response.status}`);
            } else {
              console.log(`[useChat] Successfully updated title on server to: "${title}"`);
            }
          });
        } catch (error) {
          console.error('[useChat] Error updating title:', error);
        }
      }

      // Update the active chat
      setActiveChat(updatedChat);

      // Update the chats array
      setChats((prevChats) => {
        return prevChats.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat));
      });

      // Schedule a title update with the API as well
      if (activeChat.messages.length === 0) {
        console.log(`[useChat] This is the first message, scheduling API title update for chat ${activeChat.id}`);
        // Try multiple times to ensure the title gets updated
        setTimeout(() => {
          console.log(`[useChat] API title update attempt for chat ${activeChat.id}`);
          updateChatTitle(activeChat.id);
        }, 1000);
      }

      // Get the most appropriate model based on the prompt and available models
      let selectedModelId = modelId;
      
      if (!modelId) {
        const taskType = detectTaskType(content);
        console.log(`Detected task type: ${taskType}`);
        
        const modelsForTask = getModelsForTask(taskType, userTier);
        console.log(`Models for task ${taskType}:`, modelsForTask.map(m => m.name).join(', '));
        
        const availableModelsWithProviders = getModelsWithAvailability();
        console.log(`Available models with provider availability:`, 
          availableModelsWithProviders.map((m: AIModel & { providerAvailable: boolean }) => 
            `${m.name} (${m.provider}): ${m.providerAvailable}`
          ));
        
        // Filter for models where the provider is available
        const availableModelsForTask = modelsForTask
          .filter(model => availableProviders.includes(model.provider.toLowerCase()));
        console.log(`Available models for task: ${availableModelsForTask.map(m => m.name).join(', ')}`);
        
        // Select the first available model for the task, or fall back to any available model
        selectedModelId = availableModelsForTask.length > 0 
          ? availableModelsForTask[0].id
          : (availableModelsWithProviders.find(m => m.providerAvailable)?.id || modelsForTask[0].id);
        
        console.log(`Auto-selected model: ${selectedModelId}`);
      }

      const model = getModelById(selectedModelId || '') || getModelsForTask('general', userTier)[0];
      
      // Log the provider availability to help with debugging
      console.log(`Selected model ${model.name} from provider ${model.provider}`);
      console.log(`Provider available: ${availableProviders.includes(model.provider.toLowerCase())}`);
      console.log(`Available providers: ${availableProviders.join(', ')}`);

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
            
            // Update the chat title after the first response is received
            // Only update the title if this is the first exchange and title is still default
            if (updatedMessages.length <= 3 && prevChat.title === 'New Chat') {
              console.log(`[useChat] First message exchange complete for chat ${activeChat.id}, triggering title update`);
              // Add a slight delay to let things settle
              setTimeout(() => {
                console.log(`[useChat] Now updating title for chat ${activeChat.id}`);
                updateChatTitle(activeChat.id);
              }, 1000);
            }
            
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
  }, [activeChat, setChats, setActiveChat, updateChatTitle, getModelsWithAvailability, userTier, availableProviders, useChatApi, selectedModel]);

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
    // Skip this entire effect if we already have an active chat
    if (activeChat) {
      console.log('[useChat] Already have active chat, skipping initialization:', activeChat.id);
      initializedRef.current = true;
      return;
    }
    
    // Only run initialization once
    if (initializedRef.current) {
      console.log('[useChat] Already initialized, skipping');
      return;
    }
    
    console.log('[useChat] Initializing chat state...');
    console.log('[useChat] Initial chats:', initialChats.length);
    console.log('[useChat] Initial chat ID:', initialChatId);
    console.log('[useChat] Initial selected chat:', initialSelectedChat?.id);
    
    // Mark as initialized immediately to prevent multiple runs
    initializedRef.current = true;
    
    // Process in order of priority:
    // 1. If we have an explicitly selected chat, use it
    if (initialSelectedChat) {
      console.log('[useChat] Using provided selected chat:', initialSelectedChat.id);
      setActiveChat(initialSelectedChat);
      return;
    }
    
    // 2. If we have a specific chat ID, try to find and select it
    if (initialChatId && initialChatId !== 'new') {
      console.log('[useChat] Looking for chat with ID:', initialChatId);
      const chat = initialChats.find(c => c.id === initialChatId);
      if (chat) {
        console.log('[useChat] Found chat with ID, selecting:', chat.id);
        setActiveChat(chat);
        return;
      }
    }
    
    // 3. If we have chats, use the first one
    if (initialChats.length > 0) {
      console.log('[useChat] Using first chat:', initialChats[0].id);
      setActiveChat(initialChats[0]);
      return;
    }
    
    // IMPORTANT: We no longer automatically create chats here
    // Let the ChatInterface handle chat creation instead
    console.log('[useChat] No chats available - letting ChatInterface handle it');

  }, [initialChats, activeChat, initialChatId, initialSelectedChat]);

  // Debug logging
  useEffect(() => {
    console.log('[useChat] Initialization state:', {
      chatsCount: chats.length,
      activeChat: activeChat?.id,
      currentUser: currentUser?.id,
      initialized: initializedRef.current
    });
  }, [chats, activeChat, currentUser]);

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