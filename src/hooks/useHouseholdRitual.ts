'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getWeekKey } from '@/lib/ritual/weekKey';
import type { HouseholdRitualResponse, PartnerProgress } from '@/app/api/ritual/household/route';

export interface UseHouseholdRitualResult {
  // State
  status: 'pending' | 'in_progress' | 'needs_sync' | 'completed';
  hasPartner: boolean;
  myProgress: PartnerProgress | null;
  partnerProgress: PartnerProgress | null;
  needsSync: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  refetch: () => Promise<void>;

  // Meta
  weekKey: string;
  isDemo: boolean;
}

const POLL_INTERVAL_MS = 30000; // Poll every 30 seconds

/**
 * Hook for tracking household ritual status and partner progress
 * Enables real-time awareness of partner's ritual progress
 */
export function useHouseholdRitual(): UseHouseholdRitualResult {
  const { data: session, status: authStatus } = useSession();
  const isDemo = authStatus === 'unauthenticated' || !session?.user?.id;
  const weekKey = getWeekKey();

  const [state, setState] = useState<Omit<HouseholdRitualResponse, 'weekKey'>>({
    status: 'pending',
    hasPartner: false,
    myProgress: null,
    partnerProgress: null,
    needsSync: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch household ritual status
  const fetchStatus = useCallback(async () => {
    if (isDemo) {
      // Demo mode - no partner tracking
      setState({
        status: 'pending',
        hasPartner: false,
        myProgress: null,
        partnerProgress: null,
        needsSync: false,
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/ritual/household?week=${weekKey}`);
      if (!response.ok) {
        throw new Error('Failed to fetch household status');
      }
      const data: HouseholdRitualResponse = await response.json();
      setState({
        status: data.status,
        hasPartner: data.hasPartner,
        myProgress: data.myProgress,
        partnerProgress: data.partnerProgress,
        needsSync: data.needsSync,
      });
      setError(null);
    } catch (err) {
      console.error('Failed to fetch household ritual status:', err);
      setError('Failed to load partner status');
    } finally {
      setIsLoading(false);
    }
  }, [weekKey, isDemo]);

  // Initial load
  useEffect(() => {
    if (authStatus !== 'loading') {
      fetchStatus();
    }
  }, [authStatus, fetchStatus]);

  // Polling for partner updates (only for authenticated users with partners)
  useEffect(() => {
    if (isDemo || !state.hasPartner) {
      return;
    }

    const intervalId = setInterval(fetchStatus, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isDemo, state.hasPartner, fetchStatus]);

  // Refetch function for manual refresh
  const refetch = useCallback(async () => {
    setIsLoading(true);
    await fetchStatus();
  }, [fetchStatus]);

  return {
    status: state.status,
    hasPartner: state.hasPartner,
    myProgress: state.myProgress,
    partnerProgress: state.partnerProgress,
    needsSync: state.needsSync,
    isLoading,
    error,
    refetch,
    weekKey,
    isDemo,
  };
}
