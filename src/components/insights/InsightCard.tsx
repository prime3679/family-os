'use client';

import { useState } from 'react';
import Card from '@/components/shared/Card';
import Button from '@/components/shared/Button';
import { Insight, INSIGHT_TYPE_CONFIG, INSIGHT_SEVERITY_CONFIG } from '@/hooks/useInsights';

interface InsightCardProps {
  insight: Insight;
  onResolve: (id: string, resolution?: string) => Promise<boolean>;
  onDismiss: (id: string) => Promise<boolean>;
  onAction?: (id: string, action: string) => void;
}

export default function InsightCard({
  insight,
  onResolve,
  onDismiss,
  onAction,
}: InsightCardProps) {
  const [isResolving, setIsResolving] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const typeConfig = INSIGHT_TYPE_CONFIG[insight.type];
  const severityConfig = INSIGHT_SEVERITY_CONFIG[insight.severity];

  const handleResolve = async () => {
    setIsResolving(true);
    await onResolve(insight.id);
    setIsResolving(false);
  };

  const handleDismiss = async () => {
    setIsDismissing(true);
    await onDismiss(insight.id);
    setIsDismissing(false);
  };

  const isActionable = insight.status === 'pending' || insight.status === 'sent';

  return (
    <Card
      variant="elevated"
      padding="none"
      className={`overflow-hidden border-l-4 ${severityConfig.borderColor}`}
    >
      <div className="p-5">
        {/* Header: Type icon + Title + Status badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl" role="img" aria-label={typeConfig.label}>
              {typeConfig.icon}
            </span>
            <div>
              <h3 className="font-serif text-lg text-text-primary leading-tight">
                {insight.title}
              </h3>
              <span className="text-xs text-text-tertiary">
                {typeConfig.label}
              </span>
            </div>
          </div>
          <StatusBadge status={insight.status} severity={insight.severity} />
        </div>

        {/* Description */}
        <p className="text-text-secondary text-sm mb-4 leading-relaxed">
          {insight.description}
        </p>

        {/* SMS Preview (collapsed by default) */}
        {insight.smsMessage && (
          <div className="bg-surface-alt rounded-lg p-3 mb-4 text-sm">
            <span className="text-text-tertiary text-xs block mb-1">SMS that would be sent:</span>
            <span className="text-text-secondary">{insight.smsMessage}</span>
          </div>
        )}

        {/* Resolution info (if resolved) */}
        {insight.status === 'resolved' && insight.resolution && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <span className="text-green-700 text-sm">
              <strong>Resolution:</strong> {insight.resolution}
            </span>
            {insight.resolvedBy && (
              <span className="text-green-600 text-xs block mt-1">
                by {insight.resolvedBy.name || insight.resolvedBy.email}
              </span>
            )}
          </div>
        )}

        {/* Quick Actions based on type */}
        {isActionable && onAction && (
          <div className="flex flex-wrap gap-2 mb-4">
            {getQuickActions(insight.type).map((action) => (
              <button
                key={action.id}
                onClick={() => onAction(insight.id, action.id)}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-surface-alt hover:bg-accent-primary/10 text-text-secondary hover:text-accent-primary transition-calm"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {isActionable && (
          <div className="flex gap-3 pt-3 border-t border-border">
            <Button
              variant="primary"
              size="sm"
              onClick={handleResolve}
              disabled={isResolving || isDismissing}
              className="flex-1"
            >
              {isResolving ? 'Resolving...' : 'Mark Resolved'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              disabled={isResolving || isDismissing}
            >
              {isDismissing ? 'Dismissing...' : 'Dismiss'}
            </Button>
          </div>
        )}

        {/* Timestamp */}
        <div className="mt-3 text-xs text-text-tertiary">
          {formatRelativeTime(insight.createdAt)}
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status, severity }: { status: Insight['status']; severity: Insight['severity'] }) {
  const statusStyles = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    sent: 'bg-blue-50 text-blue-700 border-blue-200',
    resolved: 'bg-green-50 text-green-700 border-green-200',
    dismissed: 'bg-gray-50 text-gray-500 border-gray-200',
  };

  const statusLabels = {
    pending: 'Pending',
    sent: 'Sent',
    resolved: 'Resolved',
    dismissed: 'Dismissed',
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded-full border ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

interface QuickAction {
  id: string;
  label: string;
}

function getQuickActions(type: Insight['type']): QuickAction[] {
  const actions: Record<Insight['type'], QuickAction[]> = {
    calendar_gap: [
      { id: 'add_to_calendar', label: 'Add to my calendar' },
      { id: 'notify_partner', label: 'Notify partner' },
    ],
    conflict: [
      { id: 'view_conflict', label: 'View conflict' },
      { id: 'notify_partner', label: 'Notify partner' },
    ],
    coverage_gap: [
      { id: 'create_task', label: 'Create task' },
      { id: 'notify_partner', label: 'Notify partner' },
    ],
    load_imbalance: [
      { id: 'view_schedule', label: 'View schedule' },
      { id: 'suggest_swap', label: 'Suggest swap' },
    ],
    prep_reminder: [
      { id: 'mark_done', label: 'Mark as done' },
      { id: 'create_task', label: 'Create task' },
    ],
  };

  return actions[type] || [];
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
