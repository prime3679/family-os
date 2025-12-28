'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/providers/ToastProvider';

export interface Child {
  id: string;
  name: string;
  color: string;
  avatarEmoji: string | null;
  birthdate: string | null;
  createdAt: string;
}

interface UseChildrenReturn {
  children: Child[];
  isLoading: boolean;
  error: string | null;
  addChild: (child: Omit<Child, 'id' | 'createdAt'>) => Promise<Child | null>;
  updateChild: (id: string, updates: Partial<Child>) => Promise<Child | null>;
  deleteChild: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useChildren(): UseChildrenReturn {
  const { status } = useSession();
  const { showToast } = useToast();
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = useCallback(async () => {
    // In development, allow fetching without session
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev && status !== 'authenticated') {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/children');
      if (!res.ok) throw new Error('Failed to fetch children');
      const data = await res.json();
      setChildren(data.children || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const addChild = useCallback(async (child: Omit<Child, 'id' | 'createdAt'>): Promise<Child | null> => {
    try {
      const res = await fetch('/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(child),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add child');
      }

      const data = await res.json();
      setChildren(prev => [...prev, data.child]);
      showToast({ type: 'success', message: 'Child added' });
      return data.child;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add child';
      setError(errorMessage);
      showToast({ type: 'error', message: errorMessage });
      return null;
    }
  }, [showToast]);

  const updateChild = useCallback(async (id: string, updates: Partial<Child>): Promise<Child | null> => {
    try {
      // Optimistic update
      setChildren(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));

      const res = await fetch(`/api/children/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        // Revert on error
        await fetchChildren();
        const data = await res.json();
        throw new Error(data.error || 'Failed to update child');
      }

      const data = await res.json();
      showToast({ type: 'success', message: 'Child updated' });
      return data.child;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update child';
      setError(errorMessage);
      showToast({ type: 'error', message: errorMessage });
      return null;
    }
  }, [fetchChildren, showToast]);

  const deleteChild = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Optimistic delete
      setChildren(prev => prev.filter(c => c.id !== id));

      const res = await fetch(`/api/children/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        // Revert on error
        await fetchChildren();
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete child');
      }

      showToast({ type: 'success', message: 'Child removed' });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete child';
      setError(errorMessage);
      showToast({ type: 'error', message: errorMessage });
      return false;
    }
  }, [fetchChildren, showToast]);

  return {
    children,
    isLoading,
    error,
    addChild,
    updateChild,
    deleteChild,
    refetch: fetchChildren,
  };
}
