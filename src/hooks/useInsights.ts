'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/providers/ToastProvider';

export interface Insight {
  id: string;
  householdId: string;
  type: 'calendar_gap' | 'conflict' | 'coverage_gap' | 'load_imbalance' | 'prep_reminder';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  smsMessage: string;
  status: 'pending' | 'sent' | 'resolved' | 'dismissed';
  resolvedById: string | null;
  resolution: string | null;
  eventIds: string[];
  metadata: Record<string, unknown> | null;
  sentAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export interface InsightCounts {
  pending: number;
  sent: number;
  resolved: number;
  dismissed: number;
}

interface UseInsightsReturn {
  insights: Insight[];
  counts: InsightCounts;
  isLoading: boolean;
  error: string | null;
  resolveInsight: (id: string, resolution?: string) => Promise<boolean>;
  dismissInsight: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useInsights(filters?: {
  status?: Insight['status'];
  type?: Insight['type'];
}): UseInsightsReturn {
  const { status: sessionStatus } = useSession();
  const { showToast } = useToast();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [counts, setCounts] = useState<InsightCounts>({
    pending: 0,
    sent: 0,
    resolved: 0,
    dismissed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    // In development, allow fetching without session
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev && sessionStatus !== 'authenticated') {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.type) params.set('type', filters.type);

      const res = await fetch(`/api/insights?${params}`);
      if (!res.ok) throw new Error('Failed to fetch insights');

      const data = await res.json();
      setInsights(data.insights || []);
      setCounts(data.counts || { pending: 0, sent: 0, resolved: 0, dismissed: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [sessionStatus, filters?.status, filters?.type]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const resolveInsight = useCallback(async (id: string, resolution?: string): Promise<boolean> => {
    // Optimistic update
    setInsights(prev => prev.map(i =>
      i.id === id ? { ...i, status: 'resolved' as const, resolution: resolution || null } : i
    ));
    setCounts(prev => ({
      ...prev,
      pending: Math.max(0, prev.pending - 1),
      resolved: prev.resolved + 1,
    }));

    try {
      const res = await fetch(`/api/insights/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved', resolution }),
      });

      if (!res.ok) {
        await fetchInsights(); // Revert on error
        const data = await res.json();
        throw new Error(data.error || 'Failed to resolve insight');
      }

      showToast({ type: 'success', message: 'Insight resolved' });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resolve insight';
      setError(errorMessage);
      showToast({ type: 'error', message: errorMessage });
      return false;
    }
  }, [fetchInsights, showToast]);

  const dismissInsight = useCallback(async (id: string): Promise<boolean> => {
    // Optimistic update
    setInsights(prev => prev.map(i =>
      i.id === id ? { ...i, status: 'dismissed' as const } : i
    ));
    setCounts(prev => ({
      ...prev,
      pending: Math.max(0, prev.pending - 1),
      dismissed: prev.dismissed + 1,
    }));

    try {
      const res = await fetch(`/api/insights/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' }),
      });

      if (!res.ok) {
        await fetchInsights(); // Revert on error
        const data = await res.json();
        throw new Error(data.error || 'Failed to dismiss insight');
      }

      showToast({ type: 'success', message: 'Insight dismissed' });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to dismiss insight';
      setError(errorMessage);
      showToast({ type: 'error', message: errorMessage });
      return false;
    }
  }, [fetchInsights, showToast]);

  return {
    insights,
    counts,
    isLoading,
    error,
    resolveInsight,
    dismissInsight,
    refetch: fetchInsights,
  };
}

// Insight type display helpers
export const INSIGHT_TYPE_CONFIG = {
  calendar_gap: {
    label: 'Calendar Gap',
    icon: '📅',
    color: 'accent-warm',
    description: 'Event on one calendar but not the other',
  },
  conflict: {
    label: 'Conflict',
    icon: '⚠️',
    color: 'accent-alert',
    description: 'Overlapping events between parents',
  },
  coverage_gap: {
    label: 'Coverage Gap',
    icon: '🚨',
    color: 'accent-alert',
    description: 'No one available for an important time',
  },
  load_imbalance: {
    label: 'Load Imbalance',
    icon: '📊',
    color: 'accent-primary',
    description: 'Uneven distribution of events',
  },
  prep_reminder: {
    label: 'Prep Reminder',
    icon: '⚽',
    color: 'accent-calm',
    description: 'Preparation needed for upcoming event',
  },
} as const;

export const INSIGHT_SEVERITY_CONFIG = {
  high: {
    label: 'High',
    color: 'text-red-600 bg-red-50',
    borderColor: 'border-l-red-500',
  },
  medium: {
    label: 'Medium',
    color: 'text-amber-600 bg-amber-50',
    borderColor: 'border-l-amber-500',
  },
  low: {
    label: 'Low',
    color: 'text-blue-600 bg-blue-50',
    borderColor: 'border-l-blue-500',
  },
} as const;
