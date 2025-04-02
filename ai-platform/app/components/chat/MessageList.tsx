import React, { useRef, useEffect } from 'react';
import { Message as MessageType } from '@/app/types';
import Message from './Message';
import { useAutoScroll } from '@/app/lib/hooks/useAutoScroll';

interface MessageListProps {
  messages: MessageType[];
  isFirstLoad: boolean;
  initialScrollPosition?: number;
  onRetry?: (messageId: string) => void;
  onEdit?: (messageId: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isFirstLoad,
  initialScrollPosition,
  onRetry,
  onEdit
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollToBottom } = useAutoScroll(messagesEndRef, { messages });

  // Effect to handle initial scroll position
  useEffect(() => {
    if (containerRef.current && initialScrollPosition) {
      console.log('[MessageList] Setting initial scroll position:', initialScrollPosition);
      containerRef.current.scrollTop = initialScrollPosition;
    }
  }, [initialScrollPosition]);

  // Effect to scroll to bottom on new messages
  useEffect(() => {
    if (!isFirstLoad && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isFirstLoad]);

  // Prevent scrolling of the body when container is at top or bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Check if scrolling up when already at the top
      if (e.deltaY < 0 && container.scrollTop <= 0) {
        e.preventDefault();
      }
      // Check if scrolling down when already at the bottom
      else if (
        e.deltaY > 0 && 
        container.scrollHeight - container.scrollTop <= container.clientHeight + 1
      ) {
        e.preventDefault();
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
          Welcome to the Chat Interface
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md">
          Start a conversation by typing a message below. The AI will respond based on your input.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto scroll-container scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500 px-0 py-0"
      style={{ overscrollBehavior: 'contain' }}
    >
      <div className="w-full">
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList; 