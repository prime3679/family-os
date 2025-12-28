'use client';

import { useState } from 'react';

interface TaskProposal {
  type: 'createTask';
  title: string;
  description?: string;
  assignedTo?: 'parent_a' | 'parent_b' | 'both';
  priority?: 'low' | 'normal' | 'high';
  childName?: string;
}

interface EventProposal {
  type: 'createEvent';
  title: string;
  day: string;
  time: string;
  duration?: number;
  parent?: 'parent_a' | 'parent_b' | 'both';
}

interface NotifyProposal {
  type: 'notifyPartner';
  message: string;
  urgent?: boolean;
}

interface SwapProposal {
  type: 'swapEvents';
  day1: string;
  day2: string;
  eventDescription?: string;
}

interface EmailProposal {
  type: 'draftEmail';
  to: string;
  subject: string;
  body: string;
  context?: string;
}

type ToolProposal = TaskProposal | EventProposal | NotifyProposal | SwapProposal | EmailProposal;

interface ChatToolResultProps {
  proposal: ToolProposal;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  status: 'pending' | 'confirmed' | 'cancelled' | 'error';
}

const dayLabels: Record<string, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const priorityColors: Record<string, string> = {
  low: 'text-text-tertiary',
  normal: 'text-text-secondary',
  high: 'text-accent-alert',
};

const assigneeLabels: Record<string, string> = {
  parent_a: 'You',
  parent_b: 'Partner',
  both: 'Both',
};

export function ChatToolResult({ proposal, onConfirm, onCancel, status }: ChatToolResultProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  if (status === 'confirmed') {
    const getConfirmMessage = () => {
      switch (proposal.type) {
        case 'createTask':
          return { label: 'Task created!', detail: proposal.title };
        case 'createEvent':
          return { label: 'Event added!', detail: proposal.title };
        case 'notifyPartner':
          return { label: 'Message sent!', detail: proposal.message };
        case 'swapEvents':
          return { label: 'Swap proposed!', detail: `${dayLabels[proposal.day1]} ↔ ${dayLabels[proposal.day2]}` };
        case 'draftEmail':
          return { label: 'Email sent!', detail: `To: ${proposal.to}` };
      }
    };
    const msg = getConfirmMessage();

    return (
      <div className="bg-accent-calm/10 border border-accent-calm/30 rounded-xl p-4 my-2">
        <div className="flex items-center gap-2 text-accent-calm">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">{msg.label}</span>
        </div>
        <p className="text-sm text-text-secondary mt-1">{msg.detail}</p>
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="bg-surface-alt border border-border rounded-xl p-4 my-2 opacity-60">
        <p className="text-sm text-text-tertiary">Cancelled</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-accent-alert/10 border border-accent-alert/30 rounded-xl p-4 my-2">
        <div className="flex items-center gap-2 text-accent-alert">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">Something went wrong</span>
        </div>
        <p className="text-sm text-text-secondary mt-1">Please try again.</p>
      </div>
    );
  }

  // Pending state - show confirmation UI
  if (proposal.type === 'createTask') {
    return (
      <div className="bg-surface-alt border border-border rounded-xl p-4 my-2">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
            <svg className="h-5 w-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-tertiary mb-1">Create task</p>
            <p className="font-medium text-text-primary">{proposal.title}</p>
            {proposal.description && (
              <p className="text-sm text-text-secondary mt-1">{proposal.description}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {proposal.assignedTo && (
                <span className="text-xs bg-surface px-2 py-1 rounded-full text-text-secondary">
                  {assigneeLabels[proposal.assignedTo]}
                </span>
              )}
              {proposal.priority && proposal.priority !== 'normal' && (
                <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[proposal.priority]} bg-surface`}>
                  {proposal.priority === 'high' ? 'High priority' : 'Low priority'}
                </span>
              )}
              {proposal.childName && (
                <span className="text-xs bg-accent-warm/10 text-accent-warm px-2 py-1 rounded-full">
                  {proposal.childName}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="flex-1 min-h-[44px] px-4 py-2 bg-accent-primary text-white rounded-lg font-medium transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
          >
            {isConfirming ? 'Creating...' : 'Confirm'}
          </button>
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className="min-h-[44px] px-4 py-2 bg-surface border border-border text-text-secondary rounded-lg font-medium transition-colors hover:bg-surface-alt disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Event proposal
  if (proposal.type === 'createEvent') {
    return (
      <div className="bg-surface-alt border border-border rounded-xl p-4 my-2">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent-calm/10 flex items-center justify-center flex-shrink-0">
            <svg className="h-5 w-5 text-accent-calm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-tertiary mb-1">Add to calendar</p>
            <p className="font-medium text-text-primary">{proposal.title}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-surface px-2 py-1 rounded-full text-text-secondary">
                {dayLabels[proposal.day] || proposal.day} at {proposal.time}
              </span>
              {proposal.duration && (
                <span className="text-xs bg-surface px-2 py-1 rounded-full text-text-secondary">
                  {proposal.duration} min
                </span>
              )}
              {proposal.parent && (
                <span className="text-xs bg-surface px-2 py-1 rounded-full text-text-secondary">
                  {assigneeLabels[proposal.parent]}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="flex-1 min-h-[44px] px-4 py-2 bg-accent-primary text-white rounded-lg font-medium transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
          >
            {isConfirming ? 'Adding...' : 'Confirm'}
          </button>
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className="min-h-[44px] px-4 py-2 bg-surface border border-border text-text-secondary rounded-lg font-medium transition-colors hover:bg-surface-alt disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Notify partner proposal
  if (proposal.type === 'notifyPartner') {
    return (
      <div className="bg-surface-alt border border-border rounded-xl p-4 my-2">
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            proposal.urgent ? 'bg-accent-alert/10' : 'bg-accent-warm/10'
          }`}>
            <svg className={`h-5 w-5 ${proposal.urgent ? 'text-accent-alert' : 'text-accent-warm'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-tertiary mb-1">
              {proposal.urgent ? 'Send urgent message' : 'Send message to partner'}
            </p>
            <p className="font-medium text-text-primary">{proposal.message}</p>
            {proposal.urgent && (
              <span className="inline-block mt-2 text-xs bg-accent-alert/10 text-accent-alert px-2 py-1 rounded-full">
                Urgent
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="flex-1 min-h-[44px] px-4 py-2 bg-accent-primary text-white rounded-lg font-medium transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
          >
            {isConfirming ? 'Sending...' : 'Send'}
          </button>
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className="min-h-[44px] px-4 py-2 bg-surface border border-border text-text-secondary rounded-lg font-medium transition-colors hover:bg-surface-alt disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Swap events proposal
  if (proposal.type === 'swapEvents') {
    return (
      <div className="bg-surface-alt border border-border rounded-xl p-4 my-2">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
            <svg className="h-5 w-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-tertiary mb-1">Propose swap</p>
            <p className="font-medium text-text-primary">
              {proposal.eventDescription || 'Swap duties'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm bg-surface px-3 py-1 rounded-full text-text-secondary">
                {dayLabels[proposal.day1]}
              </span>
              <svg className="h-4 w-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span className="text-sm bg-surface px-3 py-1 rounded-full text-text-secondary">
                {dayLabels[proposal.day2]}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="flex-1 min-h-[44px] px-4 py-2 bg-accent-primary text-white rounded-lg font-medium transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
          >
            {isConfirming ? 'Proposing...' : 'Send Proposal'}
          </button>
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className="min-h-[44px] px-4 py-2 bg-surface border border-border text-text-secondary rounded-lg font-medium transition-colors hover:bg-surface-alt disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Email draft proposal
  if (proposal.type === 'draftEmail') {
    return (
      <div className="bg-surface-alt border border-border rounded-xl p-4 my-2">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-tertiary mb-1">Send email</p>
            {proposal.context && (
              <p className="text-xs text-text-tertiary italic mb-2">{proposal.context}</p>
            )}
            <div className="bg-white border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-text-tertiary font-medium w-12">To:</span>
                <span className="text-text-primary">{proposal.to}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-text-tertiary font-medium w-12">Subject:</span>
                <span className="text-text-primary font-medium">{proposal.subject}</span>
              </div>
              <div className="border-t border-border pt-2 mt-2">
                <p className="text-sm text-text-primary whitespace-pre-wrap">{proposal.body}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="flex-1 min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg font-medium transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {isConfirming ? 'Sending...' : 'Send Email'}
          </button>
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className="min-h-[44px] px-4 py-2 bg-surface border border-border text-text-secondary rounded-lg font-medium transition-colors hover:bg-surface-alt disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Fallback for unknown types
  return null;
}
