'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getWeekKey } from '@/lib/ritual/weekKey';

export interface BalanceData {
  weekKey: string;
  parentA: { name: string; events: number; handoffs: number; soloDays: number };
  parentB: { name: string; events: number; handoffs: number; soloDays: number };
  totalEvents: number;
  balanceScore: number;
  balanceLabel: 'balanced' | 'slight-imbalance' | 'imbalanced';
  intensity: string;
  ritualCompleted: boolean;
  prepProgress: { completed: number; total: number };
  taskProgress: { completed: number; total: number };
}

export interface TrendDataPoint {
  weekKey: string;
  label: string;
  parentAEvents: number;
  parentBEvents: number;
  totalEvents: number;
  conflictCount: number;
  intensity: string;
  ritualCompleted: boolean;
  prepCompletion: number;
  taskCompletion: number;
}

export interface TrendsData {
  data: TrendDataPoint[];
  parentAName: string;
  parentBName: string;
  summary: {
    totalWeeks: number;
    ritualsCompleted: number;
    ritualStreak: number;
    avgEventsPerWeek: number;
    avgConflictsPerWeek: number;
  };
}

interface UseAnalyticsReturn {
  balance: BalanceData | null;
  trends: TrendsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAnalytics(weekKey?: string): UseAnalyticsReturn {
  const { status } = useSession();
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentWeekKey = weekKey || getWeekKey();

  const fetchAnalytics = useCallback(async () => {
    // In development, allow fetching without session
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev && status !== 'authenticated') {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch both in parallel
      const [balanceRes, trendsRes] = await Promise.all([
        fetch(`/api/analytics/balance?week=${currentWeekKey}`),
        fetch('/api/analytics/trends?weeks=8'),
      ]);

      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setBalance(data);
      }

      if (trendsRes.ok) {
        const data = await trendsRes.json();
        setTrends(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  }, [currentWeekKey, status]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    balance,
    trends,
    isLoading,
    error,
    refetch: fetchAnalytics,
  };
}
