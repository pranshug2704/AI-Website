import { useEffect, RefObject, useCallback } from 'react';
import { Message } from '@/app/types';

interface UseAutoScrollOptions {
  messages: Message[];
  smoothScroll?: boolean;
  threshold?: number;
}

export const useAutoScroll = (
  endRef: RefObject<HTMLDivElement>,
  { messages, smoothScroll = true, threshold = 300 }: UseAutoScrollOptions
) => {
  // Function to scroll to bottom (memoized with useCallback)
  const scrollToBottom = useCallback((immediate: boolean = false) => {
    if (!endRef.current) return;
    
    // Get the scrollable container - the parent of the end reference div
    const scrollContainer = endRef.current.parentElement;
    if (scrollContainer) {
      // Scroll the container instead of using scrollIntoView
      const scrollOptions: ScrollToOptions = {
        top: scrollContainer.scrollHeight,
        behavior: immediate ? 'auto' : 'smooth'
      };
      
      // Use scrollTo method which is more reliable and contained
      scrollContainer.scrollTo(scrollOptions);
    } else {
      // Fallback if we can't find the container
      endRef.current.scrollIntoView({ 
        behavior: immediate ? 'auto' : 'smooth' 
      });
    }
  }, [endRef]);

  // Scroll when messages change
  useEffect(() => {
    if (!endRef.current) return;
    
    // Find the scrollable container
    const scrollContainer = endRef.current.parentElement;
    if (!scrollContainer) return;
    
    // Calculate if we're near the bottom
    const isNearBottom = 
      scrollContainer.scrollHeight - 
      scrollContainer.scrollTop - 
      scrollContainer.clientHeight < threshold;

    // Determine if the last message is loading
    const isNewMessageLoading = messages.length > 0 && messages[messages.length - 1]?.loading;
    
    // Auto-scroll if already near bottom or if new loading message
    if (isNearBottom || isNewMessageLoading) {
      // Add a slight delay for smoother scrolling and to ensure content is rendered
      setTimeout(() => scrollToBottom(false), 10);
    }
  }, [messages, endRef, threshold, scrollToBottom]);

  return { scrollToBottom };
}; 