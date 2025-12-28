'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { getWeekKey } from '@/lib/ritual/weekKey';
import { Child } from './useChildren';
import { useToast } from '@/components/providers/ToastProvider';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  type: 'event-prep' | 'decision-followup' | 'standalone';
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'normal' | 'high';
  assignedTo: 'parent_a' | 'parent_b' | 'both';
  dueDate: string | null;
  childId: string | null;
  child: Child | null;
  eventId: string | null;
  completedAt: string | null;
  completedBy: string | null;
  createdBy: string;
  createdAt: string;
  weekKey: string;
}

export type TaskCreate = {
  title: string;
  description?: string;
  type?: Task['type'];
  priority?: Task['priority'];
  assignedTo?: Task['assignedTo'];
  dueDate?: string | null;
  childId?: string | null;
  eventId?: string | null;
};

interface UseTasksReturn {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  weekKey: string;
  createTask: (task: TaskCreate) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<boolean>;
  toggleComplete: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const DEBOUNCE_MS = 300;

export function useTasks(weekKey?: string): UseTasksReturn {
  const { status } = useSession();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentWeekKey = weekKey || getWeekKey();

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdates = useRef<Map<string, Partial<Task>>>(new Map());

  const fetchTasks = useCallback(async () => {
    // In development, allow fetching without session
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev && status !== 'authenticated') {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/tasks?week=${currentWeekKey}`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [currentWeekKey, status]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = useCallback(async (task: TaskCreate): Promise<Task | null> => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, weekKey: currentWeekKey }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create task');
      }

      const data = await res.json();
      setTasks(prev => [...prev, data.task]);
      showToast({ type: 'success', message: 'Task created' });
      return data.task;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
      setError(errorMessage);
      showToast({ type: 'error', message: errorMessage });
      return null;
    }
  }, [currentWeekKey, showToast]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>): Promise<Task | null> => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    // Merge with pending updates
    const existing = pendingUpdates.current.get(id) || {};
    pendingUpdates.current.set(id, { ...existing, ...updates });

    // Clear existing timer
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    return new Promise((resolve) => {
      saveTimerRef.current = setTimeout(async () => {
        const taskUpdates = pendingUpdates.current.get(id);
        pendingUpdates.current.delete(id);

        if (!taskUpdates) {
          resolve(null);
          return;
        }

        try {
          const res = await fetch(`/api/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskUpdates),
          });

          if (!res.ok) {
            await fetchTasks(); // Revert on error
            const data = await res.json();
            throw new Error(data.error || 'Failed to update task');
          }

          const data = await res.json();
          // Update with server response
          setTasks(prev => prev.map(t => t.id === id ? data.task : t));
          showToast({ type: 'success', message: 'Task updated' });
          resolve(data.task);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
          setError(errorMessage);
          showToast({ type: 'error', message: errorMessage });
          resolve(null);
        }
      }, DEBOUNCE_MS);
    });
  }, [fetchTasks, showToast]);

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    // Optimistic delete
    setTasks(prev => prev.filter(t => t.id !== id));

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        await fetchTasks(); // Revert on error
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete task');
      }

      showToast({ type: 'success', message: 'Task deleted' });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
      setError(errorMessage);
      showToast({ type: 'error', message: errorMessage });
      return false;
    }
  }, [fetchTasks, showToast]);

  const toggleComplete = useCallback(async (id: string): Promise<boolean> => {
    const task = tasks.find(t => t.id === id);
    if (!task) return false;

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const result = await updateTask(id, { status: newStatus });
    return result !== null;
  }, [tasks, updateTask]);

  return {
    tasks,
    isLoading,
    error,
    weekKey: currentWeekKey,
    createTask,
    updateTask,
    deleteTask,
    toggleComplete,
    refetch: fetchTasks,
  };
}

// Helper to filter tasks
export function filterTasks(
  tasks: Task[],
  filters: {
    status?: Task['status'][];
    assignedTo?: Task['assignedTo'];
    type?: Task['type'];
    priority?: Task['priority'];
  }
): Task[] {
  return tasks.filter(task => {
    if (filters.status && !filters.status.includes(task.status)) return false;
    if (filters.assignedTo && task.assignedTo !== filters.assignedTo && task.assignedTo !== 'both') return false;
    if (filters.type && task.type !== filters.type) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    return true;
  });
}
