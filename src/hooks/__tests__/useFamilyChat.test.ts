import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useFamilyChat } from '../useFamilyChat';

describe('useFamilyChat', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useFamilyChat());

    expect(result.current.messages).toEqual([]);
    expect(result.current.input).toBe('');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('updates input when setInput is called', () => {
    const { result } = renderHook(() => useFamilyChat());

    act(() => {
      result.current.setInput('Hello');
    });

    expect(result.current.input).toBe('Hello');
  });

  it('does not submit when input is empty', async () => {
    const { result } = renderHook(() => useFamilyChat());

    await act(async () => {
      await result.current.submit();
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.messages).toEqual([]);
  });

  it('does not submit when already loading', async () => {
    // Create a mock that never resolves to simulate loading state
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useFamilyChat());

    act(() => {
      result.current.setInput('First message');
    });

    // Start first submission
    act(() => {
      result.current.submit();
    });

    expect(result.current.isLoading).toBe(true);

    // Try to submit again while loading
    act(() => {
      result.current.setInput('Second message');
    });

    await act(async () => {
      await result.current.submit();
    });

    // Should only have called fetch once
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('adds user message and makes API call on submit', async () => {
    // Mock a streaming response
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('Hello! How can I help?')
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    const { result } = renderHook(() => useFamilyChat());

    act(() => {
      result.current.setInput('Hi there');
    });

    await act(async () => {
      await result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have user message and assistant response
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[0].content).toBe('Hi there');
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.messages[1].content).toBe('Hello! How can I help?');

    // Input should be cleared
    expect(result.current.input).toBe('');
  });

  it('handles API errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
    });

    const { result } = renderHook(() => useFamilyChat());

    act(() => {
      result.current.setInput('Test message');
    });

    await act(async () => {
      await result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toContain('API error');
  });

  it('parses tool call markers from stream', async () => {
    const toolMarker = '[TOOL:createTask:{"title":"Test task"}]';
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('I\'ll create that task for you.')
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(toolMarker)
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    const { result } = renderHook(() => useFamilyChat());

    act(() => {
      result.current.setInput('Create a task');
    });

    await act(async () => {
      await result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Check that tool invocation was parsed
    const assistantMessage = result.current.messages[1];
    expect(assistantMessage.toolInvocations).toBeDefined();
    expect(assistantMessage.toolInvocations).toHaveLength(1);
    expect(assistantMessage.toolInvocations?.[0].toolName).toBe('createTask');
    expect(assistantMessage.toolInvocations?.[0].args).toEqual({ title: 'Test task' });
    expect(assistantMessage.toolInvocations?.[0].state).toBe('pending');
  });

  it('confirms tool invocation', async () => {
    // Set up initial message with tool invocation
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('Creating task...')
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('[TOOL:createTask:{"title":"Test"}]')
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    const { result } = renderHook(() => useFamilyChat());

    act(() => {
      result.current.setInput('Create task');
    });

    await act(async () => {
      await result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const messageId = result.current.messages[1].id;

    // Mock confirm API call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await act(async () => {
      await result.current.confirmTool(messageId, 'createTask');
    });

    await waitFor(() => {
      const toolState = result.current.messages[1].toolInvocations?.[0].state;
      expect(toolState).toBe('confirmed');
    });
  });

  it('handles confirm tool error', async () => {
    // Set up initial message with tool invocation
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('[TOOL:createTask:{"title":"Test"}]')
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    const { result } = renderHook(() => useFamilyChat());

    act(() => {
      result.current.setInput('Create task');
    });

    await act(async () => {
      await result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const messageId = result.current.messages[1].id;

    // Mock confirm API error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed' }),
    });

    await act(async () => {
      await result.current.confirmTool(messageId, 'createTask');
    });

    await waitFor(() => {
      const toolState = result.current.messages[1].toolInvocations?.[0].state;
      expect(toolState).toBe('error');
    });
  });

  it('cancels tool invocation', async () => {
    // Set up initial message with tool invocation
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('[TOOL:createTask:{"title":"Test"}]')
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    const { result } = renderHook(() => useFamilyChat());

    act(() => {
      result.current.setInput('Create task');
    });

    await act(async () => {
      await result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const messageId = result.current.messages[1].id;

    act(() => {
      result.current.cancelTool(messageId, 'createTask');
    });

    expect(result.current.messages[1].toolInvocations?.[0].state).toBe('cancelled');
  });

  it('stops ongoing request', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';

    mockFetch.mockImplementation(() => {
      return new Promise((_, reject) => {
        setTimeout(() => reject(abortError), 100);
      });
    });

    const { result } = renderHook(() => useFamilyChat());

    act(() => {
      result.current.setInput('Hello');
    });

    act(() => {
      result.current.submit();
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.stop();
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('sends messages in correct format to API', async () => {
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('Response')
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    const { result } = renderHook(() => useFamilyChat());

    act(() => {
      result.current.setInput('Test message');
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Test message' }],
      }),
      signal: expect.any(AbortSignal),
    });
  });
});
