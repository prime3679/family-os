import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTasks } from '../useTasks';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ status: 'authenticated' })),
}));

// Mock ToastProvider
vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: vi.fn(() => ({
    showToast: vi.fn(),
  })),
}));

// Mock weekKey utility
vi.mock('@/lib/ritual/weekKey', () => ({
  getWeekKey: vi.fn(() => '2024-W52'),
}));

describe('useTasks', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches tasks on mount', async () => {
    const mockTasks = [
      {
        id: '1',
        title: 'Test Task',
        description: 'Test description',
        type: 'standalone' as const,
        status: 'pending' as const,
        priority: 'normal' as const,
        assignedTo: 'parent_a' as const,
        dueDate: null,
        childId: null,
        child: null,
        eventId: null,
        completedAt: null,
        completedBy: null,
        createdBy: 'user1',
        createdAt: '2024-12-26T00:00:00Z',
        weekKey: '2024-W52',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tasks: mockTasks }),
    });

    const { result } = renderHook(() => useTasks());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tasks).toEqual(mockTasks);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith('/api/tasks?week=2024-W52');
  });

  it('handles fetch error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch' }),
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch tasks');
    expect(result.current.tasks).toEqual([]);
  });

  it('uses custom week key when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tasks: [] }),
    });

    const { result } = renderHook(() => useTasks('2024-W51'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/tasks?week=2024-W51');
    expect(result.current.weekKey).toBe('2024-W51');
  });

  it('creates a new task successfully', async () => {
    const mockExistingTasks = [
      {
        id: '1',
        title: 'Existing Task',
        type: 'standalone' as const,
        status: 'pending' as const,
        priority: 'normal' as const,
        assignedTo: 'parent_a' as const,
        description: null,
        dueDate: null,
        childId: null,
        child: null,
        eventId: null,
        completedAt: null,
        completedBy: null,
        createdBy: 'user1',
        createdAt: '2024-12-26T00:00:00Z',
        weekKey: '2024-W52',
      },
    ];

    const newTask = {
      id: '2',
      title: 'New Task',
      description: 'New description',
      type: 'standalone' as const,
      status: 'pending' as const,
      priority: 'high' as const,
      assignedTo: 'parent_b' as const,
      dueDate: null,
      childId: null,
      child: null,
      eventId: null,
      completedAt: null,
      completedBy: null,
      createdBy: 'user1',
      createdAt: '2024-12-26T00:00:00Z',
      weekKey: '2024-W52',
    };

    // Mock initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tasks: mockExistingTasks }),
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock create task
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ task: newTask }),
    });

    const createdTask = await result.current.createTask({
      title: 'New Task',
      description: 'New description',
      priority: 'high',
      assignedTo: 'parent_b',
    });

    expect(createdTask).toEqual(newTask);
    await waitFor(() => {
      expect(result.current.tasks).toHaveLength(2);
    });
    expect(result.current.tasks[1]).toEqual(newTask);
  });

  it('handles create task error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tasks: [] }),
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to create task' }),
    });

    const createdTask = await result.current.createTask({ title: 'New Task' });

    expect(createdTask).toBeNull();
    await waitFor(() => {
      expect(result.current.error).toBe('Failed to create task');
    });
  });

  it('deletes a task successfully', async () => {
    const mockTasks = [
      {
        id: '1',
        title: 'Task to Delete',
        type: 'standalone' as const,
        status: 'pending' as const,
        priority: 'normal' as const,
        assignedTo: 'parent_a' as const,
        description: null,
        dueDate: null,
        childId: null,
        child: null,
        eventId: null,
        completedAt: null,
        completedBy: null,
        createdBy: 'user1',
        createdAt: '2024-12-26T00:00:00Z',
        weekKey: '2024-W52',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tasks: mockTasks }),
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tasks).toHaveLength(1);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const deleteResult = await result.current.deleteTask('1');

    expect(deleteResult).toBe(true);
    await waitFor(() => {
      expect(result.current.tasks).toHaveLength(0);
    });
  });

  it('toggles task completion status', async () => {
    const mockTasks = [
      {
        id: '1',
        title: 'Task to Complete',
        type: 'standalone' as const,
        status: 'pending' as const,
        priority: 'normal' as const,
        assignedTo: 'parent_a' as const,
        description: null,
        dueDate: null,
        childId: null,
        child: null,
        eventId: null,
        completedAt: null,
        completedBy: null,
        createdBy: 'user1',
        createdAt: '2024-12-26T00:00:00Z',
        weekKey: '2024-W52',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tasks: mockTasks }),
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tasks[0].status).toBe('pending');

    // Mock the update response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        task: { ...mockTasks[0], status: 'completed' },
      }),
    });

    await waitFor(async () => {
      await result.current.toggleComplete('1');
    });

    // Wait for debounce and state update
    await waitFor(
      () => {
        expect(result.current.tasks[0].status).toBe('completed');
      },
      { timeout: 500 }
    );
  });

  it('refetches tasks when refetch is called', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tasks: [] }),
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tasks: [] }),
    });

    await waitFor(async () => {
      await result.current.refetch();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
