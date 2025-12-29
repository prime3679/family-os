'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ConversationSummary {
  id: string;
  channel: 'sms' | 'chat' | 'ritual';
  status: 'open' | 'resolved' | 'dismissed';
  topic: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
}

interface UseConversationsOptions {
  channel?: 'sms' | 'chat' | 'ritual';
  status?: 'open' | 'resolved' | 'all';
  limit?: number;
}

export function useConversations(options: UseConversationsOptions = {}) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  const fetchConversations = useCallback(async (cursor?: string) => {
    try {
      const params = new URLSearchParams();
      if (options.channel) params.set('channel', options.channel);
      if (options.status) params.set('status', options.status);
      if (options.limit) params.set('limit', String(options.limit));
      if (cursor) params.set('cursor', cursor);

      const res = await fetch(`/api/conversations?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await res.json();

      if (cursor) {
        // Appending more results
        setConversations(prev => [...prev, ...data.conversations]);
      } else {
        // Initial load
        setConversations(data.conversations);
      }
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [options.channel, options.status, options.limit]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const loadMore = useCallback(() => {
    if (nextCursor) {
      fetchConversations(nextCursor);
    }
  }, [nextCursor, fetchConversations]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    isLoading,
    error,
    hasMore: !!nextCursor,
    loadMore,
    refetch,
  };
}
