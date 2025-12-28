'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getWeekKey } from '@/lib/ritual/weekKey';
import type { PartnerDecisionsResponse, DecisionComparison } from '@/app/api/ritual/decisions/route';

export interface UsePartnerDecisionsResult {
  // State
  myDecisions: Record<string, { resolved: boolean; resolution?: string }>;
  partnerDecisions: Record<string, { resolved: boolean; resolution?: string }>;
  comparisons: DecisionComparison[];
  conflictingDecisions: string[];
  allSynced: boolean;
  hasPartner: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;

  // Actions
  syncDecision: (conflictId: string, resolution: string) => Promise<boolean>;
  refetch: () => Promise<void>;

  // Meta
  weekKey: string;
}

/**
 * Hook for comparing and syncing partner decisions
 */
export function usePartnerDecisions(): UsePartnerDecisionsResult {
  const { data: session, status: authStatus } = useSession();
  const isDemo = authStatus === 'unauthenticated' || !session?.user?.id;
  const weekKey = getWeekKey();

  const [state, setState] = useState<Omit<PartnerDecisionsResponse, 'weekKey'>>({
    hasPartner: false,
    myDecisions: {},
    partnerDecisions: {},
    comparisons: [],
    conflictingDecisions: [],
    allSynced: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch partner decisions comparison
  const fetchDecisions = useCallback(async () => {
    if (isDemo) {
      setState({
        hasPartner: false,
        myDecisions: {},
        partnerDecisions: {},
        comparisons: [],
        conflictingDecisions: [],
        allSynced: true,
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/ritual/decisions?week=${weekKey}`);
      if (!response.ok) {
        throw new Error('Failed to fetch partner decisions');
      }
      const data: PartnerDecisionsResponse = await response.json();
      setState({
        hasPartner: data.hasPartner,
        myDecisions: data.myDecisions,
        partnerDecisions: data.partnerDecisions,
        comparisons: data.comparisons,
        conflictingDecisions: data.conflictingDecisions,
        allSynced: data.allSynced,
      });
      setError(null);
    } catch (err) {
      console.error('Failed to fetch partner decisions:', err);
      setError('Failed to load partner decisions');
    } finally {
      setIsLoading(false);
    }
  }, [weekKey, isDemo]);

  // Initial load
  useEffect(() => {
    if (authStatus !== 'loading') {
      fetchDecisions();
    }
  }, [authStatus, fetchDecisions]);

  // Sync a decision to the agreed-upon resolution
  const syncDecision = useCallback(
    async (conflictId: string, resolution: string): Promise<boolean> => {
      if (isDemo) {
        return false;
      }

      setIsSyncing(true);
      try {
        const response = await fetch('/api/ritual/decisions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weekKey, conflictId, resolution }),
        });

        if (!response.ok) {
          throw new Error('Failed to sync decision');
        }

        const result = await response.json();

        // Refetch to get updated state
        await fetchDecisions();

        return result.allSynced;
      } catch (err) {
        console.error('Failed to sync decision:', err);
        setError('Failed to sync decision');
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    [weekKey, isDemo, fetchDecisions]
  );

  // Refetch function for manual refresh
  const refetch = useCallback(async () => {
    setIsLoading(true);
    await fetchDecisions();
  }, [fetchDecisions]);

  return {
    myDecisions: state.myDecisions,
    partnerDecisions: state.partnerDecisions,
    comparisons: state.comparisons,
    conflictingDecisions: state.conflictingDecisions,
    allSynced: state.allSynced,
    hasPartner: state.hasPartner,
    isLoading,
    isSyncing,
    error,
    syncDecision,
    refetch,
    weekKey,
  };
}
