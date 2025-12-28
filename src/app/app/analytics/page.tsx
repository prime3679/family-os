'use client';

import { useAnalytics } from '@/hooks/useAnalytics';
import { BalanceScorecard, WeekTrendChart, RitualCompletionCard } from '@/components/analytics';
import { Card } from '@/components/shared';
import Skeleton from '@/components/shared/Skeleton';

export default function AnalyticsPage() {
  const { balance, trends, isLoading, error } = useAnalytics();

  // Format week display
  const weekStart = new Date();
  const day = weekStart.getDay();
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
  weekStart.setDate(diff);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <header className="border-b border-border bg-surface px-6 py-4">
          <h1 className="font-serif text-xl text-text-primary">Analytics</h1>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-3xl space-y-6">
            <section>
              <h2 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wide">
                Balance Scorecard
              </h2>
              <Skeleton.BalanceCard />
            </section>
            <section>
              <h2 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wide">
                Weekly Trends
              </h2>
              <Skeleton.Chart />
            </section>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col">
        <header className="border-b border-border bg-surface px-6 py-4">
          <h1 className="font-serif text-xl text-text-primary">Analytics</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-accent-alert">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-4">
        <h1 className="font-serif text-xl text-text-primary">Family Analytics</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Week of {formatDate(weekStart)} - {formatDate(weekEnd)}
        </p>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Balance Scorecard */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wide">
              Balance Scorecard
            </h2>
            {balance ? (
              <BalanceScorecard data={balance} />
            ) : (
              <Card>
                <p className="text-text-tertiary text-center py-4">
                  Complete a planning ritual to see your balance scorecard.
                </p>
              </Card>
            )}
          </section>

          {/* This Week Summary */}
          {balance && trends && (
            <section>
              <h2 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wide">
                This Week
              </h2>
              <RitualCompletionCard balance={balance} trends={trends} />
            </section>
          )}

          {/* Trends */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wide">
              Weekly Trends
            </h2>
            {trends && trends.data.length > 0 ? (
              <WeekTrendChart data={trends} />
            ) : (
              <Card>
                <p className="text-text-tertiary text-center py-8">
                  Complete a few weeks of planning to see trends.
                </p>
              </Card>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
