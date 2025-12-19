'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { getWeekKey } from '@/lib/ritual/weekKey';

interface DecisionState {
  resolved: boolean;
  resolution?: string;
}

interface RitualState {
  weekKey: string;
  currentStep: number;
  prepItems: Record<string, boolean>;
  decisions: Record<string, DecisionState>;
  completedAt?: string;
}

export interface UseRitualStateResult {
  // State
  prepItems: Record<string, boolean>;
  decisions: Record<string, DecisionState>;
  currentStep: number;
  isLoading: boolean;
  isSaving: boolean;

  // Actions
  setPrepItemDone: (itemKey: string, done: boolean) => void;
  setDecisionResolution: (conflictId: string, resolution: string | null) => void;
  setCurrentStep: (step: number) => void;
  resetWeek: () => Promise<void>;

  // Meta
  weekKey: string;
  isDemo: boolean;
}

const STORAGE_PREFIX = 'familyos-ritual-';
const DEBOUNCE_MS = 500;

/**
 * Hook for managing ritual state with persistence
 * Uses localStorage for demo mode, API for authenticated users
 */
export function useRitualState(): UseRitualStateResult {
  const { data: session, status } = useSession();
  const isDemo = status === 'unauthenticated' || !session?.user?.id;
  const weekKey = getWeekKey();

  const [state, setState] = useState<RitualState>({
    weekKey,
    currentStep: 1,
    prepItems: {},
    decisions: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Debounce timer for saving
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<Partial<RitualState>>({});

  // Load state on mount
  useEffect(() => {
    const loadState = async () => {
      setIsLoading(true);

      if (isDemo) {
        // Load from localStorage
        try {
          const stored = localStorage.getItem(`${STORAGE_PREFIX}${weekKey}`);
          if (stored) {
            const parsed = JSON.parse(stored) as RitualState;
            setState(parsed);
          }
        } catch (error) {
          console.error('Failed to load from localStorage:', error);
        }
      } else {
        // Load from API
        try {
          const response = await fetch(`/api/ritual/state?week=${weekKey}`);
          if (response.ok) {
            const data = await response.json();
            setState(data);
          }
        } catch (error) {
          console.error('Failed to load ritual state:', error);
        }
      }

      setIsLoading(false);
    };

    // Only load after session status is determined
    if (status !== 'loading') {
      loadState();
    }
  }, [weekKey, isDemo, status]);

  // Debounced save function
  const debouncedSave = useCallback(
    (changes: Partial<RitualState>) => {
      // Merge with pending changes
      pendingChangesRef.current = {
        ...pendingChangesRef.current,
        ...changes,
        prepItems: {
          ...pendingChangesRef.current.prepItems,
          ...changes.prepItems,
        },
        decisions: {
          ...pendingChangesRef.current.decisions,
          ...changes.decisions,
        },
      };

      // Clear existing timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // Set new timer
      saveTimerRef.current = setTimeout(async () => {
        const toSave = pendingChangesRef.current;
        pendingChangesRef.current = {};

        setIsSaving(true);

        if (isDemo) {
          // Save to localStorage
          try {
            const current = localStorage.getItem(`${STORAGE_PREFIX}${weekKey}`);
            const existing = current ? JSON.parse(current) : { weekKey, currentStep: 1, prepItems: {}, decisions: {} };
            const updated = {
              ...existing,
              ...toSave,
              prepItems: { ...existing.prepItems, ...toSave.prepItems },
              decisions: { ...existing.decisions, ...toSave.decisions },
              updatedAt: new Date().toISOString(),
            };
            localStorage.setItem(`${STORAGE_PREFIX}${weekKey}`, JSON.stringify(updated));
          } catch (error) {
            console.error('Failed to save to localStorage:', error);
          }
        } else {
          // Save to API
          try {
            await fetch('/api/ritual/state', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ weekKey, ...toSave }),
            });
          } catch (error) {
            console.error('Failed to save ritual state:', error);
          }
        }

        setIsSaving(false);
      }, DEBOUNCE_MS);
    },
    [weekKey, isDemo]
  );

  // Action: Set prep item done state
  const setPrepItemDone = useCallback(
    (itemKey: string, done: boolean) => {
      setState((prev) => ({
        ...prev,
        prepItems: { ...prev.prepItems, [itemKey]: done },
      }));
      debouncedSave({ prepItems: { [itemKey]: done } });
    },
    [debouncedSave]
  );

  // Action: Set decision resolution
  const setDecisionResolution = useCallback(
    (conflictId: string, resolution: string | null) => {
      const decisionState: DecisionState = resolution
        ? { resolved: true, resolution }
        : { resolved: false };

      setState((prev) => ({
        ...prev,
        decisions: { ...prev.decisions, [conflictId]: decisionState },
      }));
      debouncedSave({ decisions: { [conflictId]: decisionState } });
    },
    [debouncedSave]
  );

  // Action: Set current step
  const setCurrentStep = useCallback(
    (step: number) => {
      setState((prev) => ({ ...prev, currentStep: step }));
      debouncedSave({ currentStep: step });
    },
    [debouncedSave]
  );

  // Action: Reset week
  const resetWeek = useCallback(async () => {
    // Clear pending saves
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    pendingChangesRef.current = {};

    // Reset local state
    setState({
      weekKey,
      currentStep: 1,
      prepItems: {},
      decisions: {},
    });

    if (isDemo) {
      // Clear localStorage
      localStorage.removeItem(`${STORAGE_PREFIX}${weekKey}`);
    } else {
      // Delete from API
      try {
        await fetch(`/api/ritual/state?week=${weekKey}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Failed to reset ritual state:', error);
      }
    }
  }, [weekKey, isDemo]);

  return {
    prepItems: state.prepItems,
    decisions: state.decisions,
    currentStep: state.currentStep,
    isLoading,
    isSaving,
    setPrepItemDone,
    setDecisionResolution,
    setCurrentStep,
    resetWeek,
    weekKey,
    isDemo,
  };
}
