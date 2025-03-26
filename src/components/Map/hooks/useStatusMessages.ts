import { useState, useRef, useCallback } from 'react';
import { UseStatusMessagesReturn } from '../types';
import { tickerTapeConfig } from '../../../styles/uiConfig';

export const useStatusMessages = (): UseStatusMessagesReturn => {
  const [statusMessages, setStatusMessages] = useState<string[]>([]);
  const messageRemovalTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Function to remove messages that have scrolled off screen
  const startMessageRemovalTimer = useCallback(() => {
    // Clear any existing message removal timer
    if (messageRemovalTimerRef.current) {
      clearTimeout(messageRemovalTimerRef.current);
    }

    // Clear messages after the configured lifespan
    // This ensures messages don't reappear and only show once
    messageRemovalTimerRef.current = setTimeout(() => {
      setStatusMessages([]);
    }, tickerTapeConfig.messageLifespan);
  }, []);

  // Function to add status messages - adds to the queue without clearing
  const addStatusMessage = useCallback((message: string) => {
    // Check if message already exists to prevent duplicates
    setStatusMessages(prev => {
      // Skip if this exact message already exists in the array
      if (prev.includes(message)) {
        return prev;
      }

      const newMessages = [...prev, message];
      return newMessages;
    });

    // Start the timer to remove messages after they've scrolled off-screen
    startMessageRemovalTimer();
  }, [startMessageRemovalTimer]);

  return {
    statusMessages,
    addStatusMessage
  };
};
