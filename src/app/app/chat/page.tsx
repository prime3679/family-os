'use client';

import { useRouter } from 'next/navigation';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { ChatInput } from '@/components/chat/ChatInput';
import { useFamilyChat } from '@/hooks/useFamilyChat';

export default function ChatPage() {
  const router = useRouter();
  const {
    messages,
    input,
    setInput,
    submit,
    isLoading,
    error,
    reload,
    confirmTool,
    cancelTool,
  } = useFamilyChat();

  const handleSubmit = () => {
    submit();
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] -ml-2 rounded-full hover:bg-surface-alt transition-colors"
          aria-label="Go back"
        >
          <svg className="h-6 w-6 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-3 flex-1">
          <div className="h-10 w-10 rounded-full bg-accent-primary/10 flex items-center justify-center">
            <svg
              className="h-6 w-6 text-accent-primary"
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
            <h1 className="font-serif text-lg text-text-primary">FamilyOS Assistant</h1>
            <p className="text-xs text-text-tertiary">
              {isLoading ? 'Thinking...' : 'Ask about your week, create tasks, and more'}
            </p>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <ChatMessages
        messages={messages}
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        onToolConfirm={confirmTool}
        onToolCancel={cancelTool}
      />

      {/* Input Area */}
      <div className="flex-shrink-0">
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={isLoading}
          placeholder="Ask about your week..."
        />
      </div>
    </div>
  );
}
