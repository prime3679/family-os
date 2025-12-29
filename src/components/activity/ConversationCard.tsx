'use client';

import Link from 'next/link';
import Card from '@/components/shared/Card';
import { ConversationSummary } from '@/hooks/useConversations';

interface ConversationCardProps {
  conversation: ConversationSummary;
}

const CHANNEL_ICONS: Record<string, string> = {
  sms: '📱',
  chat: '💬',
  ritual: '📋',
};

const CHANNEL_LABELS: Record<string, string> = {
  sms: 'SMS',
  chat: 'Chat',
  ritual: 'Ritual',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  dismissed: 'bg-gray-100 text-gray-500',
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncateMessage(content: string, maxLength = 80): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength).trim() + '...';
}

export default function ConversationCard({ conversation }: ConversationCardProps) {
  const icon = CHANNEL_ICONS[conversation.channel] || '💬';
  const label = CHANNEL_LABELS[conversation.channel] || conversation.channel;
  const statusColor = STATUS_COLORS[conversation.status] || 'bg-gray-100 text-gray-500';

  // Get preview text from most recent messages
  const lastUserMessage = [...conversation.messages].reverse().find(m => m.role === 'user');
  const lastAssistantMessage = [...conversation.messages].reverse().find(m => m.role === 'assistant');

  return (
    <Card className="hover:border-accent-primary/30 transition-calm">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-text-tertiary">{label}</span>
            <span className="text-xs text-text-tertiary">•</span>
            <span className="text-xs text-text-tertiary">{formatTime(conversation.updatedAt)}</span>
            <span className={`ml-auto px-2 py-0.5 text-xs rounded-full ${statusColor}`}>
              {conversation.status === 'open' ? 'Open' : conversation.status === 'resolved' ? 'Resolved' : 'Dismissed'}
            </span>
          </div>

          {/* Topic or preview */}
          {conversation.topic ? (
            <p className="text-sm font-medium text-text-primary mb-1">{conversation.topic}</p>
          ) : lastUserMessage ? (
            <p className="text-sm text-text-primary mb-1">
              &ldquo;{truncateMessage(lastUserMessage.content)}&rdquo;
            </p>
          ) : null}

          {/* Scout's response preview */}
          {lastAssistantMessage && (
            <p className="text-xs text-text-secondary">
              Scout: {truncateMessage(lastAssistantMessage.content, 60)}
            </p>
          )}

          {/* Message count */}
          <p className="text-xs text-text-tertiary mt-2">
            {conversation._count.messages} message{conversation._count.messages !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </Card>
  );
}
