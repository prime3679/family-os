'use client';

import { useState } from 'react';
import InsightCard from './InsightCard';
import { Insight, InsightCounts, INSIGHT_TYPE_CONFIG } from '@/hooks/useInsights';

interface InsightListProps {
  insights: Insight[];
  counts: InsightCounts;
  isLoading: boolean;
  error: string | null;
  onResolve: (id: string, resolution?: string) => Promise<boolean>;
  onDismiss: (id: string) => Promise<boolean>;
  onAction?: (id: string, action: string) => void;
}

type StatusFilter = 'all' | Insight['status'];
type TypeFilter = 'all' | Insight['type'];

export default function InsightList({
  insights,
  counts,
  isLoading,
  error,
  onResolve,
  onDismiss,
  onAction,
}: InsightListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  // Filter insights
  const filteredInsights = insights.filter((insight) => {
    if (statusFilter !== 'all' && insight.status !== statusFilter) return false;
    if (typeFilter !== 'all' && insight.type !== typeFilter) return false;
    return true;
  });

  // Group by severity for display
  const highSeverity = filteredInsights.filter((i) => i.severity === 'high');
  const mediumSeverity = filteredInsights.filter((i) => i.severity === 'medium');
  const lowSeverity = filteredInsights.filter((i) => i.severity === 'low');

  if (isLoading) {
    return <InsightListSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-accent-alert">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Counts Summary */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        <CountBadge
          label="Pending"
          count={counts.pending}
          color="amber"
          active={statusFilter === 'pending'}
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
        />
        <CountBadge
          label="Sent"
          count={counts.sent}
          color="blue"
          active={statusFilter === 'sent'}
          onClick={() => setStatusFilter(statusFilter === 'sent' ? 'all' : 'sent')}
        />
        <CountBadge
          label="Resolved"
          count={counts.resolved}
          color="green"
          active={statusFilter === 'resolved'}
          onClick={() => setStatusFilter(statusFilter === 'resolved' ? 'all' : 'resolved')}
        />
        <CountBadge
          label="Dismissed"
          count={counts.dismissed}
          color="gray"
          active={statusFilter === 'dismissed'}
          onClick={() => setStatusFilter(statusFilter === 'dismissed' ? 'all' : 'dismissed')}
        />
      </div>

      {/* Type Filter */}
      <div className="flex flex-wrap gap-2">
        <TypeFilterButton
          label="All Types"
          active={typeFilter === 'all'}
          onClick={() => setTypeFilter('all')}
        />
        {(Object.keys(INSIGHT_TYPE_CONFIG) as Insight['type'][]).map((type) => (
          <TypeFilterButton
            key={type}
            label={`${INSIGHT_TYPE_CONFIG[type].icon} ${INSIGHT_TYPE_CONFIG[type].label}`}
            active={typeFilter === type}
            onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredInsights.length === 0 && (
        <div className="text-center py-16 bg-surface-alt rounded-2xl">
          <span className="text-4xl mb-4 block">
            {statusFilter === 'all' ? '🎉' : '📭'}
          </span>
          <h3 className="font-serif text-xl text-text-primary mb-2">
            {statusFilter === 'all'
              ? 'All clear!'
              : `No ${statusFilter} insights`}
          </h3>
          <p className="text-text-secondary">
            {statusFilter === 'all'
              ? "FamilyOS hasn't detected any issues to review."
              : 'Try changing the filter to see other insights.'}
          </p>
        </div>
      )}

      {/* Grouped by Severity */}
      {highSeverity.length > 0 && (
        <SeveritySection
          label="High Priority"
          insights={highSeverity}
          onResolve={onResolve}
          onDismiss={onDismiss}
          onAction={onAction}
        />
      )}

      {mediumSeverity.length > 0 && (
        <SeveritySection
          label="Medium Priority"
          insights={mediumSeverity}
          onResolve={onResolve}
          onDismiss={onDismiss}
          onAction={onAction}
        />
      )}

      {lowSeverity.length > 0 && (
        <SeveritySection
          label="Low Priority"
          insights={lowSeverity}
          onResolve={onResolve}
          onDismiss={onDismiss}
          onAction={onAction}
        />
      )}
    </div>
  );
}

function CountBadge({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color: 'amber' | 'blue' | 'green' | 'gray';
  active: boolean;
  onClick: () => void;
}) {
  const colorStyles = {
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full border transition-calm
        ${colorStyles[color]}
        ${active ? 'ring-2 ring-accent-primary ring-offset-2' : 'hover:scale-105'}
      `}
    >
      <span className="font-medium">{label}</span>
      <span className="bg-white/50 px-2 py-0.5 rounded-full text-sm font-bold">
        {count}
      </span>
    </button>
  );
}

function TypeFilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 text-sm rounded-lg transition-calm
        ${
          active
            ? 'bg-accent-primary text-white'
            : 'bg-surface-alt text-text-secondary hover:bg-surface-alt/80'
        }
      `}
    >
      {label}
    </button>
  );
}

function SeveritySection({
  label,
  insights,
  onResolve,
  onDismiss,
  onAction,
}: {
  label: string;
  insights: Insight[];
  onResolve: (id: string, resolution?: string) => Promise<boolean>;
  onDismiss: (id: string) => Promise<boolean>;
  onAction?: (id: string, action: string) => void;
}) {
  return (
    <div>
      <h2 className="font-serif text-lg text-text-primary mb-4">{label}</h2>
      <div className="space-y-4">
        {insights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onResolve={onResolve}
            onDismiss={onDismiss}
            onAction={onAction}
          />
        ))}
      </div>
    </div>
  );
}

function InsightListSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Counts skeleton */}
      <div className="flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-28 bg-surface-alt rounded-full" />
        ))}
      </div>

      {/* Type filter skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-24 bg-surface-alt rounded-lg" />
        ))}
      </div>

      {/* Card skeletons */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-surface rounded-2xl p-5 border border-border">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-surface-alt rounded-full" />
            <div className="flex-1">
              <div className="h-5 w-2/3 bg-surface-alt rounded mb-2" />
              <div className="h-3 w-1/3 bg-surface-alt rounded" />
            </div>
          </div>
          <div className="h-4 w-full bg-surface-alt rounded mb-2" />
          <div className="h-4 w-3/4 bg-surface-alt rounded" />
        </div>
      ))}
    </div>
  );
}
