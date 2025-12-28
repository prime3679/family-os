'use client';

import { useState, useEffect, useCallback } from 'react';

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailDigest: boolean;
  emailDigestDay: string;
  emailDigestTime: string;
  emailPartnerComplete: boolean;
  pushEnabled: boolean;
  pushPartnerComplete: boolean;
  pushPartnerWaiting: boolean;
  pushPrepReminder: boolean;
  pushNudge: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  unsubscribeToken: string;
  createdAt: string;
  updatedAt: string;
}

type PreferenceUpdate = Partial<Omit<NotificationPreferences, 'id' | 'userId' | 'unsubscribeToken' | 'createdAt' | 'updatedAt'>>;

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/notifications/preferences');
      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }
      const data = await response.json();
      setPreferences(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = useCallback(async (updates: PreferenceUpdate): Promise<boolean> => {
    try {
      setIsSaving(true);
      setError(null);
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      const data = await response.json();
      setPreferences(data);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    preferences,
    isLoading,
    error,
    isSaving,
    updatePreferences,
    refetch: fetchPreferences,
  };
}
