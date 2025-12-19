'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Event, mockEvents } from '@/data/mock-data';

interface CalendarEventsResponse {
  events: Event[];
  weekStart: string;
  weekEnd: string;
  message?: string;
}

interface UseCalendarEventsResult {
  events: Event[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  weekStart: Date | null;
  weekEnd: Date | null;
  isUsingMockData: boolean;
}

export function useCalendarEvents(): UseCalendarEventsResult {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<Date | null>(null);
  const [weekEnd, setWeekEnd] = useState<Date | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  const fetchEvents = useCallback(async () => {
    // Don't fetch if not authenticated - use mock data instead
    if (!session) {
      setEvents(mockEvents);
      setIsUsingMockData(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/calendar/events');

      if (!response.ok) {
        // If unauthorized, fall back to mock data gracefully
        if (response.status === 401) {
          setEvents(mockEvents);
          setIsUsingMockData(true);
          setIsLoading(false);
          return;
        }
        throw new Error('Failed to fetch events');
      }

      const data: CalendarEventsResponse = await response.json();

      if (data.events.length === 0) {
        // No real events, use mock data for demo
        setEvents(mockEvents);
        setIsUsingMockData(true);
      } else {
        setEvents(data.events);
        setIsUsingMockData(false);
      }

      if (data.weekStart) setWeekStart(new Date(data.weekStart));
      if (data.weekEnd) setWeekEnd(new Date(data.weekEnd));
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      // Fall back to mock data on error
      setEvents(mockEvents);
      setIsUsingMockData(true);
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    // Wait for session status to resolve before fetching
    if (status === 'loading') return;
    fetchEvents();
  }, [status, fetchEvents]);

  return {
    events,
    isLoading,
    error,
    refresh: fetchEvents,
    weekStart,
    weekEnd,
    isUsingMockData,
  };
}
