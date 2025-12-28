import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatMessages } from '../ChatMessages';

describe('ChatMessages', () => {
  const mockOnToolConfirm = vi.fn();
  const mockOnToolCancel = vi.fn();
  const mockOnRetry = vi.fn();

  beforeEach(() => {
    mockOnToolConfirm.mockReset();
    mockOnToolCancel.mockReset();
    mockOnRetry.mockReset();
  });

  it('shows empty state when no messages', () => {
    render(
      <ChatMessages
        messages={[]}
        isLoading={false}
      />
    );

    expect(screen.getByText('Ask me about your week...')).toBeInTheDocument();
    expect(screen.getByText(/Try:.*Remind us to pack Emma's bag/)).toBeInTheDocument();
  });

  it('renders user messages', () => {
    const messages = [
      { id: '1', role: 'user' as const, content: 'Hello there!' },
    ];

    render(
      <ChatMessages
        messages={messages}
        isLoading={false}
      />
    );

    expect(screen.getByText('Hello there!')).toBeInTheDocument();
  });

  it('renders assistant messages', () => {
    const messages = [
      { id: '1', role: 'user' as const, content: 'Hello' },
      { id: '2', role: 'assistant' as const, content: 'Hi! How can I help?' },
    ];

    render(
      <ChatMessages
        messages={messages}
        isLoading={false}
      />
    );

    expect(screen.getByText('Hi! How can I help?')).toBeInTheDocument();
  });

  it('shows typing indicator when loading', () => {
    render(
      <ChatMessages
        messages={[{ id: '1', role: 'user' as const, content: 'Hello' }]}
        isLoading={true}
      />
    );

    // Check for the animated dots (they have animate-bounce class)
    const container = document.querySelector('.animate-bounce');
    expect(container).toBeInTheDocument();
  });

  it('does not show typing indicator when not loading', () => {
    render(
      <ChatMessages
        messages={[{ id: '1', role: 'user' as const, content: 'Hello' }]}
        isLoading={false}
      />
    );

    // Check that no animated dots are present
    const container = document.querySelector('.animate-bounce');
    expect(container).not.toBeInTheDocument();
  });

  it('shows error state with retry button', () => {
    const error = new Error('Network error occurred');

    render(
      <ChatMessages
        messages={[{ id: '1', role: 'user' as const, content: 'Hello' }]}
        isLoading={false}
        error={error}
        onRetry={mockOnRetry}
      />
    );

    // Header text
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    // Error message detail
    expect(screen.getByText('Network error occurred')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const error = new Error('Failed');

    render(
      <ChatMessages
        messages={[{ id: '1', role: 'user' as const, content: 'Hello' }]}
        isLoading={false}
        error={error}
        onRetry={mockOnRetry}
      />
    );

    fireEvent.click(screen.getByText('Try again'));
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show error while loading', () => {
    const error = new Error('Failed');

    render(
      <ChatMessages
        messages={[{ id: '1', role: 'user' as const, content: 'Hello' }]}
        isLoading={true}
        error={error}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.queryByText('Try again')).not.toBeInTheDocument();
  });

  it('renders multiple messages in order', () => {
    const messages = [
      { id: '1', role: 'user' as const, content: 'First message' },
      { id: '2', role: 'assistant' as const, content: 'Second message' },
      { id: '3', role: 'user' as const, content: 'Third message' },
    ];

    render(
      <ChatMessages
        messages={messages}
        isLoading={false}
      />
    );

    const container = document.body;
    const first = container.innerHTML.indexOf('First message');
    const second = container.innerHTML.indexOf('Second message');
    const third = container.innerHTML.indexOf('Third message');

    expect(first).toBeLessThan(second);
    expect(second).toBeLessThan(third);
  });

  it('renders message with tool invocations', () => {
    const messages = [
      {
        id: '1',
        role: 'assistant' as const,
        content: "I'll create that task for you.",
        toolInvocations: [
          {
            toolName: 'createTask',
            args: { title: 'Test task' },
            state: 'pending' as const,
          },
        ],
      },
    ];

    render(
      <ChatMessages
        messages={messages}
        isLoading={false}
        onToolConfirm={mockOnToolConfirm}
        onToolCancel={mockOnToolCancel}
      />
    );

    expect(screen.getByText("I'll create that task for you.")).toBeInTheDocument();
    expect(screen.getByText('Create task')).toBeInTheDocument();
    expect(screen.getByText('Test task')).toBeInTheDocument();
  });

  it('hides empty state when messages exist', () => {
    render(
      <ChatMessages
        messages={[{ id: '1', role: 'user' as const, content: 'Hello' }]}
        isLoading={false}
      />
    );

    expect(screen.queryByText('Ask me about your week...')).not.toBeInTheDocument();
  });

  it('displays error message text', () => {
    const error = new Error('API rate limit exceeded');

    render(
      <ChatMessages
        messages={[{ id: '1', role: 'user' as const, content: 'Hello' }]}
        isLoading={false}
        error={error}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('API rate limit exceeded')).toBeInTheDocument();
  });
});
