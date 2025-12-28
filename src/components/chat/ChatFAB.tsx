'use client';

import { useState } from 'react';

interface ChatFABProps {
  onClick: () => void;
  hasUnread?: boolean;
}

export function ChatFAB({ onClick, hasUnread = false }: ChatFABProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      className={`
        fixed bottom-6 right-6 z-40
        min-h-[56px] min-w-[56px]
        rounded-full
        bg-accent-primary text-white
        shadow-lg hover:shadow-xl
        transition-all duration-300
        hover:scale-105
        focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:ring-offset-2 focus:ring-offset-background
        ${isPressed ? 'scale-95' : ''}
      `}
      aria-label="Open chat"
    >
      {/* Chat Bubble Icon */}
      <div className="relative flex items-center justify-center">
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>

        {/* Unread Badge */}
        {hasUnread && (
          <span
            className="absolute -top-1 -right-1 h-3 w-3 bg-accent-alert rounded-full border-2 border-background"
            aria-label="Unread messages"
          />
        )}
      </div>
    </button>
  );
}
