'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Event, Conflict, WeekSummary } from '@/data/mock-data';

export interface ConflictInsight {
  explanation: string;
  suggestions: string[];
  question: string;
}

export interface WeekInsights {
  narrative: string;
  conflictInsights: Record<string, ConflictInsight>;
  prepSuggestions: Record<string, string[]>;
  decisionOptions: Record<string, string[]>;
  affirmation: {
    headline: string;
    message: string;
  };
}

interface UseWeekInsightsResult {
  insights: WeekInsights | null;
  isLoading: boolean;
  error: string | null;
  isUsingFallback: boolean;
  refresh: () => Promise<void>;
}

// Generate a hash for caching based on events and conflicts
function generateCacheKey(events: Event[], conflicts: Conflict[]): string {
  const eventIds = events.map((e) => e.id).sort().join(',');
  const conflictIds = conflicts.map((c) => c.id).sort().join(',');
  return `insights-${eventIds}-${conflictIds}`;
}

// Fallback insights when AI is unavailable
function getFallbackInsights(
  weekSummary: WeekSummary,
  conflicts: Conflict[]
): WeekInsights {
  return {
    narrative: weekSummary.narrative,
    conflictInsights: conflicts.reduce(
      (acc, conflict) => ({
        ...acc,
        [conflict.id]: {
          explanation: conflict.humanContext,
          suggestions: [],
          question: conflict.question || 'How would you like to handle this?',
        },
      }),
      {}
    ),
    prepSuggestions: {},
    decisionOptions: {},
    affirmation: {
      headline: "You've got this.",
      message:
        "You've looked at your week, identified the tricky spots, and made a plan. That's more than most.",
    },
  };
}

export function useWeekInsights(
  events: Event[],
  conflicts: Conflict[],
  weekSummary: WeekSummary
): UseWeekInsightsResult {
  const [insights, setInsights] = useState<WeekInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  // Ref to track if we've already fetched for this data
  const lastCacheKey = useRef<string>('');

  const fetchInsights = useCallback(async () => {
    const cacheKey = generateCacheKey(events, conflicts);

    // Check localStorage cache first
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        // Cache valid for 1 hour
        if (age < 60 * 60 * 1000) {
          setInsights(data);
          setIsLoading(false);
          setIsUsingFallback(false);
          return;
        }
      }
    } catch {
      // Ignore cache errors
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events, conflicts, weekSummary }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.fallback) {
          // AI unavailable, use fallback
          const fallback = getFallbackInsights(weekSummary, conflicts);
          setInsights(fallback);
          setIsUsingFallback(true);
          return;
        }
        throw new Error(errorData.error || 'Failed to fetch insights');
      }

      const data: WeekInsights = await response.json();
      setInsights(data);
      setIsUsingFallback(false);

      // Cache the result
      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ data, timestamp: Date.now() })
        );
      } catch {
        // Ignore cache errors
      }
    } catch (err) {
      console.error('Error fetching AI insights:', err);
      // Fall back to non-AI insights
      const fallback = getFallbackInsights(weekSummary, conflicts);
      setInsights(fallback);
      setIsUsingFallback(true);
      setError(err instanceof Error ? err.message : 'Failed to fetch insights');
    } finally {
      setIsLoading(false);
    }
  }, [events, conflicts, weekSummary]);

  useEffect(() => {
    const cacheKey = generateCacheKey(events, conflicts);
    // Only fetch if data has changed
    if (cacheKey !== lastCacheKey.current && events.length > 0) {
      lastCacheKey.current = cacheKey;
      fetchInsights();
    }
  }, [events, conflicts, fetchInsights]);

  return {
    insights,
    isLoading,
    error,
    isUsingFallback,
    refresh: fetchInsights,
  };
}

/**
 * Hook for streaming AI responses
 */
export function useStreamingResponse() {
  const [text, setText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const startStream = useCallback(
    async (
      type: 'prep' | 'decision' | 'detail',
      context: {
        event?: Event;
        conflict?: Conflict;
        question?: string;
      }
    ) => {
      // Cancel any existing stream
      if (abortController.current) {
        abortController.current.abort();
      }

      abortController.current = new AbortController();
      setIsStreaming(true);
      setText('');
      setError(null);

      try {
        const response = await fetch('/api/ai/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, context }),
          signal: abortController.current.signal,
        });

        if (!response.ok) {
          throw new Error('Stream failed');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let result = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          result += chunk;
          setText(result);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Cancelled, not an error
          return;
        }
        console.error('Streaming error:', err);
        setError(err instanceof Error ? err.message : 'Streaming failed');
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  const cancel = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
    }
  }, []);

  const reset = useCallback(() => {
    setText('');
    setError(null);
  }, []);

  return {
    text,
    isStreaming,
    error,
    startStream,
    cancel,
    reset,
  };
}
