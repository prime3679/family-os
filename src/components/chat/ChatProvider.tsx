'use client';

import { useState } from 'react';
import { ChatFAB } from './ChatFAB';
import { ChatDrawer } from './ChatDrawer';
import { useFamilyChat } from '@/hooks/useFamilyChat';

export function ChatProvider() {
  const [isOpen, setIsOpen] = useState(false);
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
    <>
      {/* FAB - only show when drawer is closed */}
      {!isOpen && (
        <ChatFAB
          onClick={() => setIsOpen(true)}
          hasUnread={false}
        />
      )}

      {/* Chat Drawer */}
      <ChatDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        onToolConfirm={confirmTool}
        onToolCancel={cancelTool}
      />
    </>
  );
}
