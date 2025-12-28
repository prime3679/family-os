'use client';

import { useState, useEffect, useCallback } from 'react';

interface NudgeStatus {
  canNudge: boolean;
  cooldownMinutes?: number;
  lastNudgeAt?: string;
  reason?: 'cooldown' | 'no_partner';
}

export function usePartnerNudge() {
  const [status, setStatus] = useState<NudgeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/notifications/nudge');
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const sendNudge = useCallback(async (message?: string): Promise<boolean> => {
    try {
      setIsSending(true);
      setError(null);

      const response = await fetch('/api/notifications/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setStatus({
            canNudge: false,
            reason: 'cooldown',
            cooldownMinutes: data.cooldownMinutes,
          });
          setError(data.message);
        } else {
          setError(data.error || 'Failed to send nudge');
        }
        return false;
      }

      // Refresh status after sending
      await checkStatus();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send nudge');
      return false;
    } finally {
      setIsSending(false);
    }
  }, [checkStatus]);

  return {
    canNudge: status?.canNudge ?? false,
    cooldownMinutes: status?.cooldownMinutes,
    reason: status?.reason,
    isLoading,
    isSending,
    error,
    sendNudge,
    refreshStatus: checkStatus,
  };
}
