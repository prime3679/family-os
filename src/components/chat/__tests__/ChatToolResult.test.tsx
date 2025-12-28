import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatToolResult } from '../ChatToolResult';

describe('ChatToolResult', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnConfirm.mockReset();
    mockOnCancel.mockReset();
  });

  describe('createTask proposal', () => {
    const taskProposal = {
      type: 'createTask' as const,
      title: 'Pack lunch',
      description: 'Pack healthy lunch for school',
      assignedTo: 'parent_a' as const,
      priority: 'high' as const,
      childName: 'Emma',
    };

    it('renders task proposal with all details', () => {
      render(
        <ChatToolResult
          proposal={taskProposal}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          status="pending"
        />
      );

      expect(screen.getByText('Create task')).toBeInTheDocument();
      expect(screen.getByText('Pack lunch')).toBeInTheDocument();
      expect(screen.getByText('Pack healthy lunch for school')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument(); // parent_a label
      expect(screen.getByText('High priority')).toBeInTheDocument();
      expect(screen.getByText('Emma')).toBeInTheDocument();
    });

    it('calls onConfirm when confirm button is clicked', async () => {
      mockOnConfirm.mockResolvedValueOnce(undefined);

      render(
        <ChatToolResult
          proposal={taskProposal}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          status="pending"
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onCancel when cancel button is clicked', () => {
      render(
        <ChatToolResult
          proposal={taskProposal}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          status="pending"
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('shows confirmed state', () => {
      render(
        <ChatToolResult
          proposal={taskProposal}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          status="confirmed"
        />
      );

      expect(screen.getByText('Task created!')).toBeInTheDocument();
      expect(screen.getByText('Pack lunch')).toBeInTheDocument();
    });

    it('shows cancelled state', () => {
      render(
        <ChatToolResult
          proposal={taskProposal}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          status="cancelled"
        />
      );

      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });

    it('shows error state', () => {
      render(
        <ChatToolResult
          proposal={taskProposal}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          status="error"
        />
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Please try again.')).toBeInTheDocument();
    });

    it('disables buttons while confirming', async () => {
      mockOnConfirm.mockImplementation(() => new Promise(() => {}));

      render(
        <ChatToolResult
          proposal={taskProposal}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          status="pending"
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument();
      });

      expect(confirmButton).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });
  });

  describe('createEvent proposal', () => {
    const eventProposal = {
      type: 'createEvent' as const,
      title: 'Soccer practice',
      day: 'tue',
      time: '4:00 PM',
      duration: 60,
      parent: 'parent_b' as const,
    };

    it('renders event proposal with all details', () => {
      render(
        <ChatToolResult
          proposal={eventProposal}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          status="pending"
        />
      );

      expect(screen.getByText('Add to calendar')).toBeInTheDocument();
      expect(screen.getByText('Soccer practice')).toBeInTheDocument();
      expect(screen.getByText(/Tuesday at 4:00 PM/)).toBeInTheDocument();
      expect(screen.getByText('60 min')).toBeInTheDocument();
      expect(screen.getByText('Partner')).toBeInTheDocument();
    });

    it('shows confirmed state for event', () => {
      render(
        <ChatToolResult
          proposal={eventProposal}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          status="confirmed"
        />
      );

      expect(screen.getByText('Event added!')).toBeInTheDocument();
    });
  });

  describe('notifyPartner proposal', () => {
    const notifyProposal = {
      type: 'notifyPartner' as const,
      message: "I'm running 10 minutes late",
      urgent: false,
    };

    it('renders notify proposal', () => {
      render(
        <ChatToolResult
          proposal={notifyProposal}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          status="pending"
        />
      );

      expect(screen.getByText('Send message to partner')).toBeInTheDocument();
      expect(screen.getByText("I'm running 10 minutes late")).toBeInTheDocument();
    });

    it('renders urgent notify proposal with badge', () => {
      const urgentProposal = {
        ...notifyProposal,
        urgent: true,
      };

      render(
        <ChatToolResult
          proposal={urgentProposal}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          status="pending"
        />
      );

      expect(screen.getByText('Send urgent message')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });

    it('shows Send button for notify', () => {
      render(
        <ChatToolResult
          proposal={notifyProposal}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          status="pending"
        />
      );

      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('shows confirmed state for notify', () => {
      render(
        <ChatToolResult
          proposal={notifyProposal}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          status="confirmed"
        />
      );

      expect(screen.getByText('Message sent!')).toBeInTheDocument();
    });
  });

  describe('swapEvents proposal', () => {
    const swapProposal = {
      type: 'swapEvents' as const,
      day1: 'mon',
      day2: 'wed',
      eventDescription: 'School pickup',
    };

    it('renders swap proposal', () => {
      render(
        <ChatToolResult
          proposal={swapProposal}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          status="pending"
        />
      );

      expect(screen.getByText('Propose swap')).toBeInTheDocument();
      expect(screen.getByText('School pickup')).toBeInTheDocument();
      expect(screen.getByText('Monday')).toBeInTheDocument();
      expect(screen.getByText('Wednesday')).toBeInTheDocument();
    });

    it('shows default description when none provided', () => {
      const swapWithoutDesc = {
        type: 'swapEvents' as const,
        day1: 'tue',
        day2: 'thu',
      };

      render(
        <ChatToolResult
          proposal={swapWithoutDesc}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          status="pending"
        />
      );

      expect(screen.getByText('Swap duties')).toBeInTheDocument();
    });

    it('shows Send Proposal button for swap', () => {
      render(
        <ChatToolResult
          proposal={swapProposal}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          status="pending"
        />
      );

      expect(screen.getByRole('button', { name: /send proposal/i })).toBeInTheDocument();
    });

    it('shows confirmed state for swap', () => {
      render(
        <ChatToolResult
          proposal={swapProposal}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          status="confirmed"
        />
      );

      expect(screen.getByText('Swap proposed!')).toBeInTheDocument();
      expect(screen.getByText(/Monday.*Wednesday/)).toBeInTheDocument();
    });
  });
});
