'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/shared/Card';
import Skeleton from '@/components/shared/Skeleton';

interface DashboardData {
  weekKey: string;
  stats: {
    pendingTasks: number;
    conflicts: number;
    activeInsights: number;
  };
  tasks: Array<{
    id: string;
    title: string;
    priority: 'low' | 'normal' | 'high';
    status: string;
    childName: string | null;
  }>;
  insights: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    description: string;
  }>;
  ritual: {
    userStatus: 'not_started' | 'in_progress' | 'completed';
    userStep: number;
  };
  partner: {
    status: 'not_started' | 'in_progress' | 'completed' | 'no_partner';
    name: string | null;
    step: number | null;
  };
}

const INSIGHT_ICONS: Record<string, string> = {
  calendar_gap: '📅',
  conflict: '⚠️',
  coverage_gap: '🚨',
  load_imbalance: '📊',
  prep_reminder: '⚽',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  normal: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error('Failed to load dashboard');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Card variant="subtle" className="text-center py-8">
          <p className="text-text-secondary">Failed to load dashboard</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-accent-primary hover:underline"
          >
            Try again
          </button>
        </Card>
      </div>
    );
  }

  // Format week key for display
  const [year, week] = data.weekKey.split('-W');
  const weekDisplay = `Week ${week}, ${year}`;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl text-text-primary">Dashboard</h1>
            <p className="mt-1 text-sm text-text-secondary">{weekDisplay}</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              label="Pending Tasks"
              value={data.stats.pendingTasks}
              href="/app/tasks"
              icon="📝"
            />
            <StatCard
              label="Conflicts"
              value={data.stats.conflicts}
              href="/app/insights"
              icon="⚠️"
              alert={data.stats.conflicts > 0}
            />
            <StatCard
              label="Insights"
              value={data.stats.activeInsights}
              href="/app/insights"
              icon="💡"
              alert={data.stats.activeInsights > 0}
            />
          </div>

          {/* Partner & Ritual Status */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Your Ritual Status */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg text-text-primary">Your Weekly Ritual</h2>
                <RitualBadge status={data.ritual.userStatus} />
              </div>
              <p className="text-sm text-text-secondary mb-4">
                {data.ritual.userStatus === 'completed'
                  ? 'You\'ve completed this week\'s planning!'
                  : data.ritual.userStatus === 'in_progress'
                    ? `Step ${data.ritual.userStep} of 5 - keep going!`
                    : 'Start your weekly planning to sync with your partner'}
              </p>
              <Link
                href="/app/ritual"
                className="inline-flex items-center gap-2 text-sm font-medium text-accent-primary hover:underline"
              >
                {data.ritual.userStatus === 'completed' ? 'View ritual' : 'Continue ritual'}
                <span>→</span>
              </Link>
            </Card>

            {/* Partner Status */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg text-text-primary">
                  {data.partner.name ? `${data.partner.name}'s Status` : 'Partner Status'}
                </h2>
                {data.partner.status !== 'no_partner' && (
                  <RitualBadge status={data.partner.status} />
                )}
              </div>
              <p className="text-sm text-text-secondary mb-4">
                {data.partner.status === 'completed'
                  ? 'Partner has completed their planning!'
                  : data.partner.status === 'in_progress'
                    ? `On step ${data.partner.step} of 5`
                    : data.partner.status === 'not_started'
                      ? 'Partner hasn\'t started yet'
                      : 'No partner connected yet'}
              </p>
              {data.partner.status === 'no_partner' && (
                <Link
                  href="/app/settings/household"
                  className="inline-flex items-center gap-2 text-sm font-medium text-accent-primary hover:underline"
                >
                  Invite partner
                  <span>→</span>
                </Link>
              )}
            </Card>
          </div>

          {/* Tasks & Insights */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Recent Tasks */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg text-text-primary">Tasks</h2>
                <Link
                  href="/app/tasks"
                  className="text-sm text-accent-primary hover:underline"
                >
                  View all
                </Link>
              </div>
              {data.tasks.length === 0 ? (
                <p className="text-sm text-text-secondary py-4 text-center">
                  No pending tasks
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.tasks.slice(0, 4).map((task) => (
                    <li key={task.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority}
                      </span>
                      <span className="text-sm text-text-primary flex-1 truncate">{task.title}</span>
                      {task.childName && (
                        <span className="text-xs text-text-tertiary">{task.childName}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Recent Insights */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg text-text-primary">Insights</h2>
                <Link
                  href="/app/insights"
                  className="text-sm text-accent-primary hover:underline"
                >
                  View all
                </Link>
              </div>
              {data.insights.length === 0 ? (
                <p className="text-sm text-text-secondary py-4 text-center">
                  No active insights
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.insights.slice(0, 4).map((insight) => (
                    <li key={insight.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                      <span className="text-lg">{INSIGHT_ICONS[insight.type] || '💡'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">{insight.title}</p>
                        <p className="text-xs text-text-tertiary truncate">{insight.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Quick Actions */}
          <Card variant="warm">
            <h2 className="font-serif text-lg text-text-primary mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <QuickActionButton href="/app/chat" icon="💬" label="Chat with AI" />
              <QuickActionButton href="/app/week" icon="📅" label="View Week" />
              <QuickActionButton href="/app/tasks" icon="✓" label="Manage Tasks" />
              <QuickActionButton href="/app/children" icon="👶" label="Kids" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  icon,
  alert,
}: {
  label: string;
  value: number;
  href: string;
  icon: string;
  alert?: boolean;
}) {
  return (
    <Link href={href}>
      <Card
        className={`hover:border-accent-primary/50 transition-calm ${alert ? 'border-amber-400/50' : ''}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className={`text-2xl font-bold ${alert ? 'text-amber-600' : 'text-text-primary'}`}>
              {value}
            </p>
            <p className="text-xs text-text-secondary">{label}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function RitualBadge({ status }: { status: 'not_started' | 'in_progress' | 'completed' | 'no_partner' }) {
  const config = {
    not_started: { label: 'Not started', color: 'bg-gray-100 text-gray-600' },
    in_progress: { label: 'In progress', color: 'bg-amber-100 text-amber-700' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
    no_partner: { label: 'No partner', color: 'bg-gray-100 text-gray-500' },
  };
  const { label, color } = config[status];
  return (
    <span className={`px-2 py-1 text-xs rounded-full ${color}`}>
      {label}
    </span>
  );
}

function QuickActionButton({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface hover:bg-surface-alt transition-calm border border-border"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs text-text-secondary">{label}</span>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-surface px-6 py-4">
        <Skeleton className="h-7 w-32 mb-2" />
        <Skeleton className="h-4 w-24" />
      </header>
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
