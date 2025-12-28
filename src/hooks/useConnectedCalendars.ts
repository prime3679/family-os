'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  primary?: boolean;
}

interface ConnectedCalendar {
  id: string;
  googleCalendarId: string;
  name: string;
  color: string;
  included: boolean;
  lastSyncedAt: string | null;
}

interface FamilyMember {
  id: string;
  role: string;
  displayName: string;
}

interface CalendarsResponse {
  connected: boolean;
  familyMember: FamilyMember | null;
  connectedCalendars: ConnectedCalendar[];
  availableCalendars: GoogleCalendar[];
  message?: string;
}

interface UseConnectedCalendarsResult {
  isConnected: boolean;
  familyMember: FamilyMember | null;
  connectedCalendars: ConnectedCalendar[];
  availableCalendars: GoogleCalendar[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  connectCalendar: (calendarId: string, name: string, color?: string) => Promise<void>;
  toggleCalendar: (calendarId: string, included: boolean) => Promise<void>;
  disconnectCalendar: (calendarId: string) => Promise<void>;
  setupFamilyMember: (role: string, displayName: string) => Promise<void>;
}

export function useConnectedCalendars(): UseConnectedCalendarsResult {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [familyMember, setFamilyMember] = useState<FamilyMember | null>(null);
  const [connectedCalendars, setConnectedCalendars] = useState<ConnectedCalendar[]>([]);
  const [availableCalendars, setAvailableCalendars] = useState<GoogleCalendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendars = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/calendar/calendars');

      if (!response.ok) {
        throw new Error('Failed to fetch calendars');
      }

      const data: CalendarsResponse = await response.json();

      setIsConnected(data.connected);
      setFamilyMember(data.familyMember);
      setConnectedCalendars(data.connectedCalendars);
      setAvailableCalendars(data.availableCalendars);
    } catch (err) {
      console.error('Error fetching calendars:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch calendars');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const connectCalendar = async (calendarId: string, name: string, color?: string) => {
    try {
      const response = await fetch('/api/calendar/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          calendarId,
          name,
          color,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect calendar');
      }

      await fetchCalendars();
      router.refresh(); // Refresh server components to update layout
    } catch (err) {
      console.error('Error connecting calendar:', err);
      throw err;
    }
  };

  const toggleCalendar = async (calendarId: string, included: boolean) => {
    try {
      const response = await fetch('/api/calendar/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle',
          calendarId,
          included,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle calendar');
      }

      // Optimistic update
      setConnectedCalendars((prev) =>
        prev.map((cal) =>
          cal.id === calendarId ? { ...cal, included } : cal
        )
      );
    } catch (err) {
      console.error('Error toggling calendar:', err);
      await fetchCalendars(); // Revert on error
      throw err;
    }
  };

  const disconnectCalendar = async (calendarId: string) => {
    try {
      const response = await fetch('/api/calendar/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disconnect',
          calendarId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect calendar');
      }

      await fetchCalendars();
      router.refresh(); // Refresh server components to update layout
    } catch (err) {
      console.error('Error disconnecting calendar:', err);
      throw err;
    }
  };

  const setupFamilyMember = async (role: string, displayName: string) => {
    try {
      const response = await fetch('/api/calendar/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setup',
          role,
          displayName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to setup family member');
      }

      await fetchCalendars();
      router.refresh(); // Refresh server components to update layout
    } catch (err) {
      console.error('Error setting up family member:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  return {
    isConnected,
    familyMember,
    connectedCalendars,
    availableCalendars,
    isLoading,
    error,
    refresh: fetchCalendars,
    connectCalendar,
    toggleCalendar,
    disconnectCalendar,
    setupFamilyMember,
  };
}
