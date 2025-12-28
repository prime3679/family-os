'use client';

import { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';

interface ToolInvocation {
  toolName: string;
  args: Record<string, unknown>;
  state: 'pending' | 'confirmed' | 'cancelled' | 'error';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: ToolInvocation[];
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
  error?: Error;
  onRetry?: () => void;
  onToolConfirm?: (messageId: string, toolName: string) => Promise<void>;
  onToolCancel?: (messageId: string, toolName: string) => void;
}

export function ChatMessages({ messages, isLoading, error, onRetry, onToolConfirm, onToolCancel }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {messages.length === 0 && !isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-2">
            <div className="text-4xl">💬</div>
            <p className="text-text-secondary text-base">
              Ask me about your week...
            </p>
            <p className="text-text-tertiary text-sm max-w-xs">
              Try: &quot;Remind us to pack Emma&apos;s bag&quot; or &quot;What&apos;s on Tuesday?&quot;
            </p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onToolConfirm={onToolConfirm}
              onToolCancel={onToolCancel}
            />
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="max-w-[80%] px-4 py-2.5 rounded-2xl bg-surface-alt rounded-bl-sm">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && !isLoading && (
            <div className="flex justify-start mb-4">
              <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-accent-alert/10 border border-accent-alert/30 rounded-bl-sm">
                <div className="flex items-start gap-2">
                  <svg className="h-5 w-5 text-accent-alert flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-text-primary">Something went wrong</p>
                    <p className="text-xs text-text-tertiary mt-1">{error.message || 'Please try again'}</p>
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="mt-2 text-xs text-accent-primary hover:underline"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}
