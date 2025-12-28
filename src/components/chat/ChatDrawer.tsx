'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';

interface ToolInvocation {
  toolName: string;
  args: Record<string, unknown>;
  state: 'pending' | 'confirmed' | 'cancelled' | 'error';
}

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    toolInvocations?: ToolInvocation[];
  }>;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  error?: Error;
  onRetry?: () => void;
  onToolConfirm?: (messageId: string, toolName: string) => Promise<void>;
  onToolCancel?: (messageId: string, toolName: string) => void;
}

export function ChatDrawer({
  isOpen,
  onClose,
  messages,
  input,
  onInputChange,
  onSubmit,
  isLoading = false,
  error,
  onRetry,
  onToolConfirm,
  onToolCancel,
}: ChatDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const drawerHeight = isExpanded ? '80vh' : '60vh';

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-50
          bg-surface border-t border-border shadow-2xl
          rounded-t-3xl
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
          flex flex-col
        `}
        style={{ height: drawerHeight }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-accent-primary/10 flex items-center justify-center">
              <svg
                className="h-5 w-5 text-accent-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <div>
              <h2 className="font-serif text-lg text-text-primary">Chat with FamilyOS</h2>
              <p className="text-xs text-text-tertiary">
                {messages.length === 0 ? 'Start a conversation' : `${messages.length} messages`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Expand/Collapse Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2 text-text-secondary hover:text-text-primary transition-colors"
              aria-label={isExpanded ? "Collapse chat" : "Expand chat"}
            >
              <svg
                className={`h-5 w-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2 text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Close chat"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          error={error}
          onRetry={onRetry}
          onToolConfirm={onToolConfirm}
          onToolCancel={onToolCancel}
        />

        {/* Input */}
        <div className="flex-shrink-0">
          <ChatInput
            value={input}
            onChange={onInputChange}
            onSubmit={onSubmit}
            disabled={isLoading}
            placeholder="Type a message..."
          />
        </div>
      </div>
    </>
  );
}
